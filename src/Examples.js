import React, { useEffect, useState, useContext } from 'react';
import { ExtensionContext } from '@looker/extension-sdk-react';
import Modal from 'react-modal';

const Examples = () => {
    const [selectedModel, setSelectedModel] = useState('');
    const [selectedExplore, setSelectedExplore] = useState('');
    const [models, setModels] = useState([]);
    const [explores, setExplores] = useState([]);
    const [examplesData, setExamplesData] = useState([]);
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [jsonEditData, setJsonEditData] = useState({});
    const [editIndex, setEditIndex] = useState(null);
    const [editQuestion, setEditQuestion] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedExamplesModal, setGeneratedExamplesModal] = useState(false);
    const [generatedExamples, setGeneratedExamples] = useState([]);
    const [selectedGeneratedExamples, setSelectedGeneratedExamples] = useState([]);
    const [modalJsonError, setModalJsonError] = useState(null);
    const { core40SDK } = useContext(ExtensionContext);

    const defaultJson = {
        "query.model": "MODEL_NAME",
        "query.view": "EXPLORE_NAME",
        "query.fields": ["VIEW_NAME.DIMENSION_NAME", "VIEW_NAME.MEASURE_NAME"],
        "query.filters": { "VIEW_NAME.DIMENSION_NAME": "FILTER" },
        "query.limit": "10",
        "query.column_limit": "50",
        "query.sorts": ["VIEW_NAME.DIMENSION_NAME DESC"]
    };

    const cleanAndParseJson = (jsonString) => {
        try {
            // If it's already an object, return it
            if (typeof jsonString === 'object') {
                return jsonString;
            }

            // Parse the initial JSON
            const parsed = JSON.parse(jsonString);

            // Special handling for specific fields that are stringified
            const processedJson = {
                ...parsed,
                'query.fields': typeof parsed['query.fields'] === 'string'
                    ? JSON.parse(parsed['query.fields'])
                    : parsed['query.fields'],
                'query.filters': typeof parsed['query.filters'] === 'string'
                    ? JSON.parse(parsed['query.filters'])
                    : parsed['query.filters'],
                'query.sorts': typeof parsed['query.sorts'] === 'string'
                    ? JSON.parse(parsed['query.sorts'])
                    : parsed['query.sorts'],
                'query.limit': Number(parsed['query.limit'] || 0),
                'query.column_limit': Number(parsed['query.column_limit'] || 0)
            };

            return processedJson;
        } catch (error) {
            console.error('JSON parsing error:', error, 'Original string:', jsonString);
            return parsed;
        }
    };

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
                    const data = await core40SDK.ok(
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
                    setExamplesData(data);
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
                    .replace(/\\/g, "") // Remove backslashes
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
                        json: processedItem
                    });
                    console.log('results: ', results)
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

    const handleFetchExamples = async () => {
        if (selectedModel) {
            try {
                const data = await core40SDK.ok(
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
                setExamplesData(data);
            } catch (error) {
                console.error('Error fetching examples data:', error);
            }
        }
    };



    const handleGenerateExamples = async () => {
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
                        limit: 4
                    },
                    result_format: 'json',
                })
            );

            const processedResults = await processItems(response);
            setGeneratedExamples(processedResults);
            setGeneratedExamplesModal(true);
        } catch (error) {
            console.error('Error generating examples:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddGeneratedExample = (example) => {
        const cleanedJson = cleanAndParseJson(JSON.stringify(example.json));

        setExamplesData([
            ...examplesData,
            {
                'examples.input_question': example.question,
                'examples.output_json': JSON.stringify(cleanedJson)
            }
        ]);
        // Do not close the modal after adding
    };

    const handleSelectGeneratedExample = (index) => {
        const selectedIndex = selectedGeneratedExamples.indexOf(index);
        if (selectedIndex > -1) {
            // Deselect if already selected
            setSelectedGeneratedExamples(
                selectedGeneratedExamples.filter(i => i !== index)
            );
        } else {
            // Select the example
            setSelectedGeneratedExamples([...selectedGeneratedExamples, index]);
        }
    };

    const handleAddSelectedGeneratedExamples = () => {
        const newExamples = selectedGeneratedExamples.map(index => {
            const example = generatedExamples[index];
            const cleanedJson = cleanAndParseJson(JSON.stringify(example.json));

            return {
                'examples.input_question': example.question,
                'examples.output_json': JSON.stringify(cleanedJson)
            };
        });

        setExamplesData([...examplesData, ...newExamples]);
        setSelectedGeneratedExamples([]);
        // Do not close the modal after adding
    };

    const handleJsonFieldChange = (key, value) => {
        try {
            const updatedJsonData = { ...jsonEditData };

            if (key === 'query.filters') {
                // Try parsing JSON, handle string or object input
                updatedJsonData[key] = typeof value === 'string'
                    ? JSON.parse(value)
                    : value;
            } else if (key === 'query.fields' || key === 'query.sorts') {
                // Handle array fields
                updatedJsonData[key] = typeof value === 'string'
                    ? JSON.parse(value)
                    : value;
            } else {
                updatedJsonData[key] = value;
            }

            setJsonEditData(updatedJsonData);
            setModalJsonError(null);
        } catch (error) {
            setModalJsonError(`Error parsing ${key}: ${error.message}`);
        }
    };

    const handleEditJson = (index) => {
        const currentJson = examplesData[index]['examples.output_json'] || JSON.stringify(defaultJson);
        const currentQuestion = examplesData[index]['examples.input_question'] || '';

        try {
            const parsedJson = cleanAndParseJson(currentJson);
            setJsonEditData(parsedJson);
            setEditQuestion(currentQuestion);
            setEditIndex(index);
            setModalIsOpen(true);
        } catch (error) {
            alert(`
            Invalid JSON format! Please correct it manually.
            Ensure it follows this pattern:
            "query.model": "MODEL_NAME",
            "query.view": "EXPLORE_NAME",
            "query.fields": ["VIEW_NAME.DIMENSION_NAME", "VIEW_NAME.MEASURE_NAME"],
            "query.filters": { "VIEW_NAME.DIMENSION_NAME": "FILTER" },
            "query.limit": "10",
            "query.column_limit": "50",
            "query.sorts": ["VIEW_NAME.DIMENSION_NAME DESC"]
            Use https://jsonlint.com/ to help!
            `);
        }
    };

    const handleCellEdit = (index, field, value) => {
        const updatedRows = [...examplesData];
        updatedRows[index][`examples.${field}`] = value;
        setExamplesData(updatedRows);
    };

    const handleModalSave = () => {
        try {
            const updatedJsonString = JSON.stringify(jsonEditData);

            const updatedRows = [...examplesData];
            updatedRows[editIndex] = {
                'examples.output_json': updatedJsonString,
                'examples.input_question': editQuestion,
            };

            setExamplesData(updatedRows);
            setModalIsOpen(false);
        } catch (error) {
            console.error('Error saving modal data:', error);
            alert('Failed to save changes. Please ensure the JSON is valid.');
        }
    };

    const handleDeleteRow = (index) => {
        const updatedRows = examplesData.filter((_, i) => i !== index);
        setExamplesData(updatedRows);
    };

    const handleAddRow = () => {
        setExamplesData([
            ...examplesData,
            { 'examples.input_question': '', 'examples.output_json': '' }
        ]);
    };

    const handleUpload = async () => {
        if (!examplesData || examplesData.length === 0) {
            alert('No data to upload. Please add rows first.');
            return;
        }

        try {
            const uploadedData = examplesData.map((row) => ({
                input_question: row['examples.input_question']
                    ? row['examples.input_question'].replace(/\n/g, ' ').trim()
                    : null,
                output_json: row['examples.output_json']
                    ? row['examples.output_json'].replace(/\n/g, ' ').trim()
                    : null,
            }));

            console.log('Uploading data:', uploadedData);

            const rows = uploadedData.map(data =>
                `STRUCT(${data.input_question !== null ? `'${data.input_question.replace(/'/g, "\\'")}' AS input_question` : 'NULL'}, ` +
                `${data.output_json !== null ? `'${data.output_json.replace(/'/g, "\\'")}' AS output_json` : 'NULL'})`
            );

            const deleteQuery = `
                DELETE FROM \`chatter.examples\`
                WHERE model = '${selectedModel.replace(/'/g, "\\'")}'
                  AND explore = '${selectedExplore.replace(/'/g, "\\'")}'
            `;

            const insertQuery = `
                INSERT INTO \`chatter.examples\` (
                    input_question,
                    output_json,
                    explore,
                    model
                )
                SELECT 
                    input_question, 
                    output_json, 
                    '${selectedExplore.replace(/'/g, "\\'")}' AS explore,
                    '${selectedModel.replace(/'/g, "\\'")}' AS model
                FROM UNNEST([${rows.join(',')}]);
            `;

            const sqlQuery = `${deleteQuery};\n${insertQuery}`;
            console.log('Generated Query:', sqlQuery);

            const sqlQueryResponse = await core40SDK.ok(
                core40SDK.create_sql_query({
                    model_name: selectedModel,
                    sql: sqlQuery,
                })
            );

            console.log('SQL Query Creation Response:', sqlQueryResponse);

            const { slug } = sqlQueryResponse;
            const runResponse = await core40SDK.ok(
                core40SDK.run_sql_query(slug, 'json')
            );

            console.log('Run Response:', runResponse);
            alert('Fields updated successfully!');
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed. Please try again.');
        }
    };

    const spinnerKeyframes = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;


    return (
        <div style={styles.container}>
            <style>{spinnerKeyframes}</style>
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
                    onClick={handleFetchExamples}
                    style={{
                        ...styles.button,
                        opacity: (!selectedModel || !selectedExplore) ? 0.6 : 1,
                        cursor: (!selectedModel || !selectedExplore) ? 'not-allowed' : 'pointer'
                    }}
                    disabled={!selectedModel || !selectedExplore}
                >
                    Fetch Examples
                </button>
                <button
                    onClick={handleGenerateExamples}
                    style={{
                        ...styles.button,
                        opacity: (!selectedModel || !selectedExplore) ? 0.6 : 1,
                        cursor: (!selectedModel || !selectedExplore) ? 'not-allowed' : 'pointer'
                    }}
                    disabled={!selectedModel || !selectedExplore}
                >
                    Generate Examples
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
                                            <th style={styles.th}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {examplesData.map((row, index) => (
                                            <tr key={index}>
                                                <td style={styles.td}>
                                                    <textarea
                                                        value={row['examples.input_question']}
                                                        onChange={(e) => handleCellEdit(index, 'input_question', e.target.value)}
                                                        style={styles.cellTextarea}
                                                    />
                                                </td>
                                                <td style={styles.td}>
                                                    <textarea
                                                        value={row['examples.output_json']}
                                                        onChange={(e) => handleCellEdit(index, 'output_json', e.target.value)}
                                                        style={styles.cellTextarea}
                                                    />
                                                </td>
                                                <td style={styles.actionCell}>
                                                    <button
                                                        onClick={() => handleEditJson(index)}
                                                        style={styles.actionButton}
                                                    >
                                                        Edit JSON
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteRow(index)}
                                                        style={{ ...styles.actionButton, backgroundColor: '#dc3545' }}
                                                    >
                                                        Delete
                                                    </button>
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
                    </>
                )}
            </div>

            {/* Edit Modal */}
            <Modal isOpen={modalIsOpen} onRequestClose={() => setModalIsOpen(false)} style={styles.modal}>
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Edit Example</h2>
                </div>
                <div style={styles.modalBody}>
                    {modalJsonError && (
                        <div style={{ color: 'red', marginBottom: '10px' }}>
                            {modalJsonError}
                        </div>
                    )}
                    <div style={styles.modalSection}>
                        <h3 style={styles.modalSectionTitle}>Input Question</h3>
                        <textarea
                            value={editQuestion}
                            onChange={(e) => setEditQuestion(e.target.value)}
                            style={styles.modalTextarea}
                        />
                    </div>
                    <div style={styles.modalSection}>
                        <h3 style={styles.modalSectionTitle}>JSON Configuration</h3>
                        {Object.entries(jsonEditData).map(([key, value]) => (
                            <div key={key} style={styles.modalRow}>
                                <label style={styles.modalLabel}>{key}</label>
                                {key === 'query.filters' ? (
                                    <textarea
                                        value={JSON.stringify(value, null, 2)}
                                        onChange={(e) => handleJsonFieldChange(key, e.target.value)}
                                        style={styles.modalJsonInput}
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={typeof value === 'object' ? JSON.stringify(value) : value}
                                        onChange={(e) => handleJsonFieldChange(key, e.target.value)}
                                        style={styles.modalInput}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                <div style={styles.modalFooter}>
                    <button onClick={() => setModalIsOpen(false)} style={styles.secondaryButton}>Cancel</button>
                    <button onClick={handleModalSave} style={styles.primaryButton}>Save</button>
                </div>
            </Modal>

            {/* Generated Examples Modal */}
            <Modal isOpen={generatedExamplesModal} onRequestClose={() => setGeneratedExamplesModal(false)} style={styles.modal}>
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Generated Examples</h2>
                </div>
                <div style={styles.modalBody}>
                    <div style={styles.modalSection}>
                        {generatedExamples.map((example, index) => (
                            <div
                                key={index}
                                style={{
                                    ...styles.generatedExample,
                                    backgroundColor: selectedGeneratedExamples.includes(index)
                                        ? '#e9ecef'
                                        : '#f8f9fa'
                                }}
                                onClick={() => handleSelectGeneratedExample(index)}
                            >
                                <h4 style={styles.generatedExampleTitle}>Example {index + 1}</h4>
                                <div style={styles.generatedExampleContent}>
                                    <p style={styles.generatedExampleQuestion}><strong>Question:</strong> {example.question}</p>
                                    <pre style={styles.generatedExampleJson}>
                                        <strong>JSON:</strong> {JSON.stringify(example.json, null, 2).replace(/\\"/g, '"').replace(/\\n|\\t|\\r/g, '')}
                                    </pre>
                                    <button
                                        onClick={() => {
                                            handleAddGeneratedExample(example);
                                            setGeneratedExamplesModal(false);
                                        }}
                                        style={styles.addExampleButton}
                                    >
                                        Add to Examples
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div style={styles.modalFooter}>
                <button 
                        onClick={handleAddSelectedGeneratedExamples} 
                        style={styles.primaryButton}
                        disabled={selectedGeneratedExamples.length === 0}
                    >
                        Add Selected Examples
                    </button>
                    <button 
                        onClick={() => setGeneratedExamplesModal(false)} 
                        style={styles.secondaryButton}
                    >
                        Close
                    </button>
                </div>
            </Modal>
        </div>
    );
};

const styles = {
    generatedExample: {
        marginBottom: '20px',
        padding: '15px',
        borderRadius: '6px',
        border: '1px solid #dee2e6',
        backgroundColor: '#f8f9fa',
    },
    generatedExampleTitle: {
        margin: '0 0 10px 0',
        fontSize: '16px',
        fontWeight: '600',
        color: '#212529',
    },
    generatedExampleContent: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    generatedExampleQuestion: {
        margin: '0',
        fontSize: '14px',
        color: '#495057',
    },
    generatedExampleJson: {
        margin: '0',
        padding: '10px',
        backgroundColor: '#fff',
        borderRadius: '4px',
        fontSize: '13px',
        fontFamily: 'monospace',
        overflowX: 'auto',
    },
    addExampleButton: {
        alignSelf: 'flex-end',
        padding: '8px 16px',
        fontSize: '13px',
        fontWeight: '500',
        backgroundColor: '#28a745',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
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
    cellTextarea: {
        width: '100%',
        minHeight: '120px',
        padding: '8px',
        border: '1px solid #ced4da',
        borderRadius: '4px',
        fontSize: '14px',
        resize: 'vertical',
        backgroundColor: '#fff',
    },
    td: {
        padding: '12px',
        borderBottom: '1px solid #dee2e6',
        color: '#212529',
        minWidth: '200px',
        maxWidth: '400px',
        verticalAlign: 'top',
    },
    buttonContainer: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
        marginTop: '20px',
        marginBottom: '20px',
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
    modal: {
        content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)',
            padding: '0', // Remove padding to avoid double scrollbars
            borderRadius: '8px',
            border: '1px solid #dee2e6',
            backgroundColor: '#fff',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            maxWidth: '80%',
            width: '80%',
            maxHeight: '90vh', // Limit height
            overflow: 'hidden', // Hide overflow on container
        },
        overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }
    },
    modalHeader: {
        backgroundColor: '#f8f9fa',
        padding: '15px 20px',
        borderBottom: '1px solid #dee2e6',
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px',
    },
    modalTitle: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#212529',
        margin: 0,
    },
    modalBody: {
        padding: '20px',
        maxHeight: 'calc(90vh - 140px)', // Account for header/footer
        overflowY: 'auto', // Enable scrolling
    },
    modalSection: {
        marginBottom: '20px',
    },
    modalSectionTitle: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#495057',
        marginBottom: '10px',
    },
    modalRow: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '10px',
        justifyContent: 'space-between',
    },
    modalLabel: {
        fontSize: '14px',
        color: '#495057',
        fontWeight: '600',
        marginRight: '10px',
    },
    modalInput: {
        padding: '8px',
        borderRadius: '5px',
        border: '1px solid #ccc',
        fontSize: '14px',
        flex: 1,
    },
    modalTextarea: {
        width: '100%',
        minHeight: '100px',
        padding: '8px',
        borderRadius: '5px',
        border: '1px solid #ccc',
        fontSize: '14px',
        resize: 'vertical',
    },
    modalJsonInput: {
        width: '100%',
        minHeight: '80px',
        padding: '8px',
        borderRadius: '5px',
        border: '1px solid #ccc',
        fontSize: '14px',
        fontFamily: 'monospace',
        resize: 'vertical',
    },
    modalFooter: {
        padding: '15px 20px',
        borderTop: '1px solid #dee2e6',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
    },
    actionCell: {
        padding: '12px',
        borderBottom: '1px solid #dee2e6',
        whiteSpace: 'nowrap',
        width: '200px',
    },
    actionButton: {
        padding: '6px 12px',
        fontSize: '13px',
        fontWeight: '500',
        backgroundColor: '#0d6efd',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        marginRight: '8px',
        transition: 'background-color 0.2s',
    },
    selectionContainer: {
        padding: '20px',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        gap: '15px',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        flexWrap: 'wrap', // Add this to handle smaller screens
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
        flex: '0 0 auto', // Add this to prevent button from stretching
    },
};

export default Examples;