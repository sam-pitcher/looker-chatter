import React, { useEffect, useState, useContext } from 'react';
import { ExtensionContext } from '@looker/extension-sdk-react';
import Modal from 'react-modal';
import { styles } from './styles_example'; // Import your styles

const ExampleComponent = ({ agent }) => {
    const [examplesData, setExamplesData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentEditIndex, setCurrentEditIndex] = useState(null);
    const [editingJson, setEditingJson] = useState('');
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

    useEffect(() => {
        const fetchExamplesData = async () => {
            if (agent) {
                setIsLoading(true);
                try {
                    const data = await core40SDK.ok(
                        core40SDK.run_inline_query({
                            body: {
                                model: "chatter",
                                view: "examples",
                                fields: ["examples.model", "examples.explore", "examples.input_question", "examples.output_json"],
                                filters: {
                                    'examples.agent': agent
                                }
                            },
                            result_format: 'json',
                        })
                    );
                    setExamplesData(data);
                } catch (error) {
                    console.error('Error fetching examples data:', error);
                } finally {
                    setIsLoading(false);
                }
            }
        };
        fetchExamplesData();
    }, [agent]);

    // Modal functions
    const handleEditJson = (index) => {
        setCurrentEditIndex(index);
        setEditingJson(examplesData[index]['examples.output_json'] || JSON.stringify(defaultJson, null, 2));
        setIsModalOpen(true);
    };

    const handleSaveJson = () => {
        try {
            // Validate JSON
            JSON.parse(editingJson);

            // Update the data
            const updatedRows = [...examplesData];
            updatedRows[currentEditIndex]['examples.output_json'] = editingJson;
            setExamplesData(updatedRows);

            setIsModalOpen(false);
        } catch (error) {
            alert('Invalid JSON format. Please check your input.');
        }
    };

    const handleCellEdit = (index, field, value) => {
        const updatedRows = [...examplesData];
        updatedRows[index][`examples.${field}`] = value;
        setExamplesData(updatedRows);
    };

    const handleDeleteRow = (index) => {
        const updatedRows = examplesData.filter((_, i) => i !== index);
        setExamplesData(updatedRows);
    };

    const handleAddRow = () => {
        setExamplesData([
            ...examplesData,
            {
                'examples.model': '',
                'examples.explore': '',
                'examples.input_question': '',
                'examples.output_json': ''
            }
        ]);
    };

    const handleUpload = async () => {
        if (!examplesData || examplesData.length === 0) {
            alert('No data to upload. Please add rows first.');
            return;
        }

        try {
            setIsLoading(true);
            const uploadedData = examplesData.map((row) => ({
                model: row['examples.model'] ? row['examples.model'].trim() : null,
                explore: row['examples.explore'] ? row['examples.explore'].trim() : null,
                input_question: row['examples.input_question'] ? row['examples.input_question'].replace(/\n/g, ' ').trim() : null,
                output_json: row['examples.output_json'] ? row['examples.output_json'].replace(/\n/g, ' ').trim() : null,
            }));

            const rows = uploadedData.map(data =>
                `STRUCT('${data.model.replace(/'/g, "\\'")}' AS model, ` +
                `'${data.explore.replace(/'/g, "\\'")}' AS explore, ` +
                `'${data.input_question.replace(/'/g, "\\'")}' AS input_question, ` +
                `'${data.output_json.replace(/'/g, "\\'")}' AS output_json)`
            );

            const deleteQuery = `
                DELETE FROM \`chatter.examples\`
                WHERE agent = '${agent.replace(/'/g, "\\'")}'
            `;

            const insertQuery = `
                INSERT INTO \`chatter.examples\` (
                    model,
                    explore,
                    input_question,
                    output_json,
                    agent
                )
                SELECT 
                    model,
                    explore,
                    input_question,
                    output_json,
                    '${agent.replace(/'/g, "\\'")}' AS agent
                FROM UNNEST([${rows.join(',')}]);
            `;

            const sqlQuery = `${deleteQuery};\n${insertQuery}`;

            const sqlQueryResponse = await core40SDK.ok(
                core40SDK.create_sql_query({
                    model_name: "chatter",
                    sql: sqlQuery,
                })
            );

            const { slug } = sqlQueryResponse;
            await core40SDK.ok(
                core40SDK.run_sql_query(slug, 'json')
            );

            alert('Examples updated successfully!');
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.resultsContainer}>
                {isLoading ? (
                    <div style={styles.loaderContainer}>
                        <div style={styles.spinner}></div>
                    </div>
                ) : (
                    <div style={styles.scrollableContent}> {/* New wrapper for scrolling */}
                        <div style={styles.resultBox}>
                            <h3 style={styles.heading}>Examples Data</h3>
                            <div style={styles.tableWrapper}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={styles.th}>Model</th>
                                            <th style={styles.th}>Explore</th>
                                            <th style={styles.th}>Input Question</th>
                                            <th style={styles.th}>Output JSON</th>
                                            <th style={styles.th}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {examplesData.map((row, index) => (
                                            <tr key={index}>
                                                <td style={styles.td}>
                                                    <input
                                                        type="text"
                                                        value={row['examples.model'] || ''}
                                                        onChange={(e) => handleCellEdit(index, 'model', e.target.value)}
                                                        style={styles.input}
                                                    />
                                                </td>
                                                <td style={styles.td}>
                                                    <input
                                                        type="text"
                                                        value={row['examples.explore'] || ''}
                                                        onChange={(e) => handleCellEdit(index, 'explore', e.target.value)}
                                                        style={styles.input}
                                                    />
                                                </td>
                                                <td style={styles.td}>
                                                    <textarea
                                                        value={row['examples.input_question'] || ''}
                                                        onChange={(e) => handleCellEdit(index, 'input_question', e.target.value)}
                                                        style={styles.cellTextarea}
                                                    />
                                                </td>
                                                <td style={styles.td}>
                                                    <div style={styles.jsonPreview}>
                                                        {row['examples.output_json'] ?
                                                            row['examples.output_json'].substring(0, 100) + '...' :
                                                            'No JSON'}
                                                    </div>
                                                    <button
                                                        onClick={() => handleEditJson(index)}
                                                        style={styles.editJsonButton}
                                                    >
                                                        Edit JSON
                                                    </button>
                                                </td>
                                                <td style={styles.actionCell}>
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
                                <div style={styles.buttonContainer}>
                                    <button onClick={handleAddRow} style={styles.secondaryButton}>
                                        Add Row
                                    </button>
                                    <button onClick={handleUpload} style={styles.primaryButton}>
                                        Upload
                                    </button>
                                </div>
                            </div>
                        </div>
                        {/* Move buttons inside scrollable content */}

                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onRequestClose={() => setIsModalOpen(false)}
                style={styles.modal}
                contentLabel="Edit JSON"
            >
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Edit JSON</h2>
                </div>
                <div style={styles.modalBody}>
                    <div style={styles.modalSection}>
                        <div style={styles.jsonGuide}>
                            <h4 style={styles.jsonGuideTitle}>Expected JSON Format:</h4>
                            <pre style={styles.jsonGuideCode}>
                                {JSON.stringify(defaultJson, null, 2)}
                            </pre>
                        </div>
                        <textarea
                            value={editingJson}
                            onChange={(e) => setEditingJson(e.target.value)}
                            style={styles.modalJsonInput}
                        />
                    </div>
                </div>
                <div style={styles.modalFooter}>
                    <button
                        onClick={() => setIsModalOpen(false)}
                        style={styles.modalSecondaryButton}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSaveJson}
                        style={styles.modalPrimaryButton}
                    >
                        Save Changes
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default ExampleComponent;