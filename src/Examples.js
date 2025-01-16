import React, { useEffect, useState, useContext } from 'react';
import { ExtensionContext } from '@looker/extension-sdk-react';

const Examples = () => {
    const [selectedModel, setSelectedModel] = useState('');
    const [selectedExplore, setSelectedExplore] = useState('');
    const [models, setModels] = useState([]);
    const [explores, setExplores] = useState([]);
    const [queryResults, setQueryResults] = useState(null);
    const [secondQueryResults, setSecondQueryResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const { core40SDK } = useContext(ExtensionContext);

    useEffect(() => {
        const fetchModels = async () => {
            try {
                const allModels = await core40SDK.ok(core40SDK.all_lookml_models({ fields: "" }));
                setModels(allModels);
            } catch (error) {
                console.error('Error fetching LookML models:', error);
            }
        };
        fetchModels();
    }, []);

    useEffect(() => {
        const fetchExplores = async () => {
            if (selectedModel) {
                try {
                    const model = await core40SDK.ok(core40SDK.lookml_model(selectedModel));
                    setExplores(model.explores);
                } catch (error) {
                    console.error('Error fetching explores for model:', error);
                }
            }
        };
        fetchExplores();
    }, [selectedModel]);

    useEffect(() => {
        const fetchExamplesData = async () => {
            if (selectedModel) {
                try {
                    const examplesData = await core40SDK.ok(
                        core40SDK.run_inline_query({
                            body: {
                                model: "chatter",
                                view: "examples",
                                fields: ["examples.input_question", "examples.output_json"],
                                filters: {
                                    'examples.explore': selectedExplore,
                                    'examples.model': selectedModel
                                }
                            },
                            result_format: 'json',
                        })
                    );
                    setSecondQueryResults(examplesData);
                } catch (error) {
                    console.error('Error fetching examples data:', error);
                }
            }
        };
        fetchExamplesData();
    }, [selectedModel]);

    const processItems = async (items) => {
        try {
            const results = [];
            for (const item of items) {
                const processedItem = { ...item };
                delete processedItem['query.id'];
                delete processedItem['history.count'];

                const formattedItem = JSON.stringify(processedItem)
                    .replace(/\\u0027/g, "'")
                    .replace(/\\/g, "")
                    .replace(/"/g, "'");

                try {
                    const response = await Promise.race([
                        core40SDK.ok(
                            core40SDK.run_inline_query({
                                body: {
                                    model: 'chatter',
                                    view: 'json_prompt',
                                    fields: ['json_prompt.generated_content'],
                                    filters: {
                                        'json_prompt.prompt_input': `"${formattedItem}"`,
                                    },
                                },
                                result_format: 'json',
                            })
                        ),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Request timed out')), 15000)
                        ),
                    ]);

                    const question = response[0]?.["json_prompt.generated_content"] || "No generated content";
                    results.push({
                        question,
                        url: JSON.stringify({
                            ...processedItem,
                            "query.fields": Array.isArray(processedItem["query.fields"])
                                ? processedItem["query.fields"]
                                : JSON.parse(processedItem["query.fields"] || "[]"),
                            "query.filters": typeof processedItem["query.filters"] === "string"
                                ? JSON.parse(processedItem["query.filters"] || "{}")
                                : processedItem["query.filters"],
                            "query.sorts": typeof processedItem["query.sorts"] === "string"
                                ? JSON.parse(processedItem["query.sorts"] || "[]")
                                : processedItem["query.sorts"],
                        }),
                    });
                } catch (error) {
                    console.error('Error processing item:', error);
                }
            }
            return results;
        } catch (error) {
            console.error('Error processing items:', error);
            return [];
        }
    };

    const handleRunQuery = async () => {
        if (!selectedModel || !selectedExplore) return;

        setIsLoading(true);
        try {
            const response = await core40SDK.ok(
                core40SDK.run_inline_query({
                    body: {
                        model: "system__activity",
                        view: "history",
                        fields: [
                            "query.model",
                            "query.view",
                            "query.id",
                            "query.fields",
                            "query.filters",
                            "query.limit",
                            "query.column_limit",
                            "query.sorts",
                            "query.pivots_used",
                            "history.count"
                        ],
                        filters: {
                            'query.model': selectedModel,
                            'query.view': selectedExplore
                        },
                        sorts: ["history.count desc"],
                        limit: 2
                    },
                    result_format: 'json',
                })
            );

            const processedResults = await processItems(response);
            const formattedOutput = processedResults.map(item => (
                `
Question:
${item.question}

Output JSON:
${item.url}

----------------------------------------`
            )).join("\n");

            setQueryResults(formattedOutput);
        } catch (error) {
            console.error('Error fetching Looker data:', error);
            setQueryResults('Error fetching data. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCellChange = (e, index, column) => {
        const updatedData = [...secondQueryResults];
        updatedData[index][column] = e.target.innerText;
        setSecondQueryResults(updatedData);
    };

    const handleAddRow = () => {
        setSecondQueryResults([
            ...secondQueryResults,
            { 'examples.input_question': '', 'examples.output_json': '' }
        ]);
    };

    const handleUpload = async () => {
        if (!secondQueryResults || secondQueryResults.length === 0) {
            alert('No data to upload. Please add rows first.');
            return;
        }

        try {
            // Prepare data for BigQuery
            const uploadedData = secondQueryResults.map((row) => ({
                input_question: row['examples.input_question'] || null,
                output_json: row['examples.output_json'] || null,
            }));

            // Log the prepared data for debugging
            console.log('Uploading data:', uploadedData);

            // Construct the SQL query as a string
            const rows = uploadedData.map(data => `
                STRUCT(
                    ${data.input_question !== null ? `'${data.input_question.replace(/'/g, "\\'")}'` : 'NULL'} AS input_question,
                    ${data.output_json !== null ? `'${data.output_json.replace(/'/g, "\\'")}'` : 'NULL'} AS output_json
                )
            `);

            const sqlQuery = `
                CREATE OR REPLACE TABLE \`chatter.examples_test\` AS
                SELECT 
                    input_question, 
                    output_json, 
                    '${selectedExplore}' AS explore,
                    '${selectedModel}' AS model,
                FROM UNNEST([${rows.join(',\n')}]);
            `;

            // Print the SQL query
            console.log('Generated SQL Query:', sqlQuery);

            // Create the SQL query using Looker SDK
            const sqlQueryResponse = await core40SDK.ok(
                core40SDK.create_sql_query({
                    // connection_name: 'sam-pitcher-playground', // Replace with your Looker connection name
                    model_name: selectedModel,
                    sql: sqlQuery,
                })
            );

            // Extract the slug from the response
            const { slug } = sqlQueryResponse;

            // Run the SQL query using Looker SDK
            const runResponse = await core40SDK.ok(
                core40SDK.run_sql_query(slug, 'json')
            );

            console.log('Run Response:', runResponse);

            alert('Table created or replaced successfully!');
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed. Please try again.');
        }
    };




    return (
        <div style={styles.container}>
            <div style={styles.selectionContainer}>
                <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    style={styles.dropdown}
                >
                    <option value="">Select Model</option>
                    {models.map((model) => (
                        <option key={model.name} value={model.name}>
                            {model.name}
                        </option>
                    ))}
                </select>
                <select
                    value={selectedExplore}
                    onChange={(e) => setSelectedExplore(e.target.value)}
                    style={styles.dropdown}
                    disabled={!selectedModel}
                >
                    <option value="">Select Explore</option>
                    {explores.map((explore) => (
                        <option key={explore.name} value={explore.name}>
                            {explore.name}
                        </option>
                    ))}
                </select>
                <button
                    onClick={handleRunQuery}
                    style={{
                        ...styles.button,
                        opacity: (!selectedModel || !selectedExplore) ? 0.6 : 1,
                        cursor: (!selectedModel || !selectedExplore) ? 'not-allowed' : 'pointer'
                    }}
                    disabled={!selectedModel || !selectedExplore}
                >
                    Run Query
                </button>
            </div>

            <div style={styles.resultsContainer}>
                {isLoading ? (
                    <div style={styles.loaderContainer}>
                        <div style={styles.spinner}></div>
                    </div>
                ) : (
                    <>
                        <div style={styles.resultBox}>
                            <h3 style={styles.heading}>Examples Data</h3>
                            <div style={styles.tableWrapper}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={styles.th}>Input Question</th>
                                            <th style={styles.th}>Output JSON</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {secondQueryResults.map((row, index) => (
                                            <tr key={index}>
                                                <td
                                                    style={styles.td}
                                                    contentEditable
                                                    suppressContentEditableWarning
                                                    onBlur={(e) => handleCellChange(e, index, 'examples.input_question')}
                                                >
                                                    {row['examples.input_question']}
                                                </td>
                                                <td
                                                    style={styles.td}
                                                    contentEditable
                                                    suppressContentEditableWarning
                                                    onBlur={(e) => handleCellChange(e, index, 'examples.output_json')}
                                                >
                                                    {row['examples.output_json']}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div style={styles.buttonContainer}>
                            <button onClick={handleAddRow} style={styles.secondaryButton}>
                                Add Row
                            </button>
                            <button onClick={handleUpload} style={styles.primaryButton}>
                                Upload
                            </button>
                        </div>

                        <div style={styles.resultBox}>
                            <h3 style={styles.heading}>Example questions and JSON from most queried Explores</h3>
                            <pre style={styles.pre}>{queryResults}</pre>
                        </div>
                    </>
                )}
            </div>


        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '90vh',
        width: '90%',
        margin: '20px auto',
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#ffffff',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
    selectionContainer: {
        padding: '20px',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        gap: '15px',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
    },
    dropdown: {
        padding: '10px',
        border: '1px solid #ced4da',
        borderRadius: '6px',
        backgroundColor: '#fff',
        fontSize: '14px',
        flex: 1,
        maxWidth: '300px',
        color: '#495057',
    },
    button: {
        padding: '10px 20px',
        fontSize: '14px',
        fontWeight: '500',
        borderRadius: '6px',
        backgroundColor: '#0d6efd',
        color: '#fff',
        border: 'none',
        transition: 'background-color 0.2s',
        minWidth: '120px',
    },
    resultsContainer: {
        padding: '20px',
        overflowY: 'auto',
        flex: 1,
        backgroundColor: '#fff',
    },
    resultBox: {
        marginBottom: '25px',
        padding: '20px',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        backgroundColor: '#fff',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    },
    heading: {
        margin: '0 0 15px 0',
        fontSize: '18px',
        fontWeight: '600',
        color: '#212529',
    },
    pre: {
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        backgroundColor: '#f8f9fa',
        padding: '15px',
        borderRadius: '6px',
        fontSize: '14px',
        color: '#495057',
    },
    loaderContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px',
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #0d6efd',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    tableWrapper: {
        overflowX: 'auto',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '14px',
    },
    th: {
        textAlign: 'left',
        padding: '12px',
        backgroundColor: '#f8f9fa',
        borderBottom: '2px solid #dee2e6',
        color: '#495057',
        fontWeight: '600',
    },
    td: {
        padding: '12px',
        borderBottom: '1px solid #dee2e6',
        color: '#212529',
        minWidth: '200px',
        maxWidth: '400px',
        overflowWrap: 'break-word',
    },
    buttonContainer: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
        marginTop: '20px',
        marginBottom: '20px',  // Add margin-bottom to create space before the next section
    },
    primaryButton: {
        padding: '10px 20px',
        fontSize: '14px',
        fontWeight: '500',
        backgroundColor: '#0d6efd',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
    secondaryButton: {
        padding: '10px 20px',
        fontSize: '14px',
        fontWeight: '500',
        backgroundColor: '#fff',
        color: '#0d6efd',
        border: '1px solid #0d6efd',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
};

export default Examples;