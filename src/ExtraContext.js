import React, { useState, useEffect, useContext } from 'react';
import { ExtensionContext } from '@looker/extension-sdk-react';

const TextUploader = () => {
    const [selectedModel, setSelectedModel] = useState('');
    const [selectedExplore, setSelectedExplore] = useState('');
    const [models, setModels] = useState([]);
    const [explores, setExplores] = useState([]);
    const [text, setText] = useState('');
    const [fetchedTexts, setFetchedTexts] = useState([]);
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

    const handleUpload = async () => {
        if (!text.trim() || !selectedModel || !selectedExplore) {
            alert('Please select a model, explore, and enter text.');
            return;
        }

        try {
            const sqlQuery = `
                DELETE FROM \`chatter.extra_context\`
                WHERE model = '${selectedModel.replace(/'/g, "\\'")}'
                AND explore = '${selectedExplore.replace(/'/g, "\\'")}';

                INSERT INTO \`chatter.extra_context\` (model, explore, extra_context)
                VALUES (
                    '${selectedModel.replace(/'/g, "\\'")}', 
                    '${selectedExplore.replace(/'/g, "\\'")}', 
                    """
                    ${text.replace(/'/g, '').replace(/"/g, '')}
                    """
                );
            `;

            const sqlQueryResponse = await core40SDK.ok(
                core40SDK.create_sql_query({
                    model_name: selectedModel,
                    sql: sqlQuery,
                })
            );

            const { slug } = sqlQueryResponse;
            await core40SDK.ok(
                core40SDK.run_sql_query(slug, 'json')
            );

            alert('Text uploaded successfully!');
            setText('');
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Failed to upload text. Please try again.');
        }
    };

    const handleFetch = async () => {
        if (!selectedModel || !selectedExplore) {
            alert('Please select a model and explore.');
            return;
        }

        try {
            const response = await core40SDK.ok(
                core40SDK.run_inline_query({
                    body: {
                        model: "chatter",
                        view: "extra_context",
                        fields: [
                            "extra_context.extra_context"
                        ],
                        filters: {
                            'extra_context.model': selectedModel,
                            'extra_context.explore': selectedExplore
                        }
                    },
                    result_format: 'json',
                })
            );

            setFetchedTexts(response);
        } catch (error) {
            console.error('Fetch failed:', error);
            alert('Failed to fetch texts. Please try again.');
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
            </div>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter your text here"
                style={styles.textArea}
            />
            <div style={styles.buttonContainer}>
                <button 
                    onClick={handleUpload} 
                    style={styles.uploadButton}
                    disabled={!selectedModel || !selectedExplore}
                >
                    Upload Text
                </button>
                <button 
                    onClick={handleFetch} 
                    style={styles.fetchButton}
                    disabled={!selectedModel || !selectedExplore}
                >
                    Fetch Texts
                </button>
            </div>
            {fetchedTexts.length > 0 && (
                <div style={styles.fetchedTextsContainer}>
                    <h3>Fetched Texts:</h3>
                    {fetchedTexts.map((item, index) => (
                        <div key={index} style={styles.fetchedTextItem}>
                            <p>{item["extra_context.extra_context"]}</p>
                        </div>
                    ))}
                </div>
            )}
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
    textArea: {
        width: '100%',
        height: '300px',
        marginBottom: '15px',
        padding: '10px',
        border: '1px solid #ced4da',
        borderRadius: '6px',
        resize: 'vertical',
        fontSize: '14px',
    },
    buttonContainer: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
        marginTop: '20px',
        marginBottom: '20px',
        marginRight: '20px',
    },
    uploadButton: {
        padding: '10px 20px',
        fontSize: '14px',
        fontWeight: '500',
        borderRadius: '6px',
        backgroundColor: '#0d6efd',
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
    },
    fetchButton: {
        padding: '10px 20px',
        fontSize: '14px',
        fontWeight: '500',
        borderRadius: '6px',
        backgroundColor: '#28a745',
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
    },
    fetchedTextsContainer: {
        marginTop: '20px',
        padding: '15px',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
    },
    fetchedTextItem: {
        borderBottom: '1px solid #f0f0f0',
        paddingBottom: '10px',
        marginBottom: '10px',
    }
};

export default TextUploader;