import React, { useEffect, useState, useContext } from 'react';
import { ExtensionContext } from '@looker/extension-sdk-react';

const Fields = () => {
    const [selectedModel, setSelectedModel] = useState('');
    const [selectedExplore, setSelectedExplore] = useState('');
    const [models, setModels] = useState([]);
    const [explores, setExplores] = useState([]);
    const [fields, setFields] = useState(null);
    const [availabilityData, setAvailabilityData] = useState([]);
    const [selectedItems, setSelectedItems] = useState({
        dimensions: {},
        measures: {},
        filters: {},
        parameters: {},
    });
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

    const handleRunQuery2 = async () => {
        try {
            const response = await core40SDK.ok(
                core40SDK.run_inline_query({
                    body: {
                        model: "chatter",
                        view: "fields",
                        fields: [
                            "fields.model",
                            "fields.explore",
                            "fields.view",
                            "fields.field",
                            "fields.field_type",
                            "fields.available_in_chatter"
                        ],
                        filters: {
                            'fields.explore': selectedExplore,
                            'fields.model': selectedModel
                        }
                    },
                    result_format: 'json',
                })
            );
            console.log('Availability Data Response:', response);
            setAvailabilityData(response);
            return response;
        } catch (error) {
            console.error('Error fetching availability data:', error);
            return [];
        }
    };

    const handleRunQuery = async () => {
        if (!selectedModel || !selectedExplore) return;

        setIsLoading(true);
        try {
            const fieldsResponse = await core40SDK.ok(
                core40SDK.lookml_model_explore(selectedModel, selectedExplore)
            );
            console.log('Fields Response:', fieldsResponse);

            const availabilityResponse = await handleRunQuery2();

            const isFieldAvailable = (fieldName) => {
                const availabilityRecord = availabilityResponse.find(
                    item => item["fields.field"] === `${fieldName}`
                );
                return availabilityRecord?.["fields.available_in_chatter"] === "Yes";
            };

            const processedFields = {
                dimensions: fieldsResponse.fields.dimensions.map(field => ({
                    ...field,
                    available: isFieldAvailable(field.name)
                })),
                measures: fieldsResponse.fields.measures.map(field => ({
                    ...field,
                    available: isFieldAvailable(field.name)
                })),
                filters: fieldsResponse.fields.filters.map(field => ({
                    ...field,
                    available: isFieldAvailable(field.name)
                })),
                parameters: fieldsResponse.fields.parameters.map(field => ({
                    ...field,
                    available: isFieldAvailable(field.name)
                }))
            };

            console.log('Processed Fields:', processedFields);
            setFields(processedFields);

            const newSelectedItems = {
                dimensions: {},
                measures: {},
                filters: {},
                parameters: {}
            };

            Object.entries(processedFields).forEach(([section, items]) => {
                items.forEach(item => {
                    if (item.available) {
                        newSelectedItems[section][item.name] = true;
                    }
                });
            });

            setSelectedItems(newSelectedItems);
        } catch (error) {
            console.error('Error fetching Looker data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            const selectedFields = [];
            Object.entries(fields).forEach(([sectionType, sectionFields]) => {
                sectionFields.forEach(field => {
                    if (selectedItems[sectionType.toLowerCase()][field.name]) {
                        selectedFields.push({
                            model: selectedModel,
                            explore: selectedExplore,
                            view: field.view,
                            field: field.name,
                            field_type: sectionType.slice(0, -1).toLowerCase()
                        });
                    }
                });
            });
    
            console.log('Selected fields to upload:', selectedFields);
    
            // Generate SQL to delete and re-insert rows
            const deleteQuery = `
                DELETE FROM \`chatter.fields\`
                WHERE model = '${selectedModel.replace(/'/g, "\\'")}'
                  AND explore = '${selectedExplore.replace(/'/g, "\\'")}'
            `;
    
            const insertRows = selectedFields.map(field => `(
                '${field.model.replace(/'/g, "\\'")}',
                '${field.explore.replace(/'/g, "\\'")}',
                '${field.view.replace(/'/g, "\\'")}',
                '${field.field.replace(/'/g, "\\'")}',
                '${field.field_type.replace(/'/g, "\\'")}',
                TRUE
            )`).join(',\n');
    
            const insertQuery = `
                INSERT INTO \`chatter.fields\` (model, explore, view, field, field_type, available_in_chatter)
                VALUES ${insertRows};
            `;
    
            const sqlQuery = `${deleteQuery};\n${insertQuery}`;
    
            console.log('Generated SQL Query:', sqlQuery);
    
            // Execute the SQL query
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
            
            // Refresh the data after successful update
            handleRunQuery();
        } catch (error) {
            console.error('Submit failed:', error);
            alert('Failed to update fields. Please try again.');
        }
    };
    
    

    const handleIncludeChange = (section, name) => {
        setSelectedItems((prev) => ({
            ...prev,
            [section]: {
                ...prev[section],
                [name]: !prev[section][name],
            },
        }));
    };
    
    const renderTable = (sectionName, sectionData) => {
        const fieldsByView = sectionData.reduce((acc, field) => {
            const viewName = field.view || 'No View';
            if (!acc[viewName]) {
                acc[viewName] = [];
            }
            acc[viewName].push(field);
            return acc;
        }, {});
    
        return (
            <div style={styles.resultBox}>
                <h3 style={styles.heading}>{sectionName}</h3>
                <div style={styles.tableWrapper}>
                    {Object.entries(fieldsByView).map(([viewName, fields]) => (
                        <div key={viewName} style={styles.viewGroup}>
                            <h4 style={styles.subheader}>{viewName}</h4>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>Name</th>
                                        <th style={styles.th}>Label</th>
                                        <th style={styles.th}>Include</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fields.map((item) => (
                                        <tr key={item.name}>
                                            <td style={styles.td}>{item.name}</td>
                                            <td style={styles.td}>{item.label}</td>
                                            <td style={styles.td}>
                                                <input
                                                    type="checkbox"
                                                    checked={!!selectedItems[sectionName.toLowerCase()][item.name]}
                                                    onChange={() => handleIncludeChange(sectionName.toLowerCase(), item.name)}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            </div>
        );
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
                        cursor: (!selectedModel || !selectedExplore) ? 'not-allowed' : 'pointer',
                    }}
                    disabled={!selectedModel || !selectedExplore}
                >
                    Run Query
                </button>
                {fields && (
                    <button
                        onClick={handleSubmit}
                        style={{
                            ...styles.button,
                            backgroundColor: '#28a745'
                        }}
                    >
                        Submit Changes
                    </button>
                )}
            </div>

            <div style={styles.resultsContainer}>
                {isLoading ? (
                    <div style={styles.loaderContainer}>
                        <div style={styles.spinner}></div>
                    </div>
                ) : fields ? (
                    <>
                        {renderTable('Dimensions', fields.dimensions || [])}
                        {renderTable('Measures', fields.measures || [])}
                        {renderTable('Filters', fields.filters || [])}
                        {renderTable('Parameters', fields.parameters || [])}
                    </>
                ) : (
                    <div style={styles.resultBox}>
                        <h3 style={styles.heading}>No data available. Please run a query.</h3>
                    </div>
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
        cursor: 'pointer',
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
    subheader: {
        margin: '0 0 10px 0',
        fontSize: '16px',
        fontWeight: '500',
        color: '#495057',
    },
    tableWrapper: {
        overflowX: 'auto',
    },
    viewGroup: {
        marginBottom: '20px',
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
};

export default Fields;