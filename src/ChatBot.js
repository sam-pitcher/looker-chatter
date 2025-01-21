import React, { useEffect, useState, useContext } from 'react';
import { ExtensionContext } from '@looker/extension-sdk-react';
import { Bar, Line } from 'react-chartjs-2';
import { Loader } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend
);

const ChatBot = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const { core40SDK } = useContext(ExtensionContext);

    const convertMessagesToBulletList = (messages) => {
        const bulletMessages = messages
        .map((item) => {
            // if (item.sender === "user") {
            //     return `- User: ${item.text}`;
            // }
            return `- ${item.sender}: ${item.text}`
        })
        .join("\n");
        console.log("Messages: ", bulletMessages)
        return bulletMessages;
    };

    const generateColor = (index, alpha = 0.2) => {
        const colors = [
            `rgba(255, 99, 132, ${alpha})`,
            `rgba(54, 162, 235, ${alpha})`,
            `rgba(255, 206, 86, ${alpha})`,
            `rgba(75, 192, 192, ${alpha})`,
            `rgba(153, 102, 255, ${alpha})`,
            `rgba(255, 159, 64, ${alpha})`
        ];
        return colors[index % colors.length];
    };

    const processQueryResponse = (response) => {
        if (!response || !response.metadata || !response.rows) {
            console.error('Invalid response structure');
            return null;
        }

        const rowsJSONString = JSON.stringify(response.rows)
            .replace(/\\u0027/g, "'")
            .replace(/\\/g, "")
            .replace(/"/g, "'");
        summariseJSONResponse(rowsJSONString)
        console.log('json_bi rows response string: ', rowsJSONString)

        const { dimensions, measures } = response.metadata.fields;

        if (!dimensions || dimensions.length === 0) {
            return null;
            // return {
            //     type: 'text',
            //     data: response.rows
            // };
        }

        const primaryDimension = dimensions[0].name;
        const pivotDimension = null; // Initialize with no pivot

        const processedData = processDataWithPivot(response.rows, primaryDimension, pivotDimension, measures);
        
        return {
            type: 'chart',
            data: processedData,
            dimensions: dimensions,
            measures: measures,
            currentDimension: primaryDimension,
            pivotDimension: pivotDimension,
            viewType: 'bar',
            sortDirection: 'asc',
            rawData: response.rows
        };
    };

    const processDataWithPivot = (rows, primaryDim, pivotDim, measures, viewType) => {
        if (!pivotDim) {
            // If no pivot dimension, process normally
            const datasets = measures.map((measure, measureIndex) => {
                const groupedData = groupDataByDimension(rows, primaryDim, measure.name);
                const labels = Object.keys(groupedData);
                const values = Object.values(groupedData);

                return {
                    label: measure.label,
                    data: values,
                    backgroundColor: generateColor(measureIndex),
                    borderColor: generateColor(measureIndex, 1),
                    borderWidth: 1,
                    tension: 0.1,
                    yAxisID: `y${measureIndex}`
                };
            });

            const labels = Object.keys(groupDataByDimension(rows, primaryDim, measures[0].name));
            return { labels, datasets };
        }

        // Process with pivot
        const uniquePivotValues = [...new Set(rows.map(row => row[pivotDim].value))].sort();
        const primaryValues = [...new Set(rows.map(row => row[primaryDim].value))].sort();

        const datasets = [];
        measures.forEach((measure, measureIndex) => {
            uniquePivotValues.forEach((pivotValue, pivotIndex) => {
                const data = primaryValues.map(primaryValue => {
                    const matchingRows = rows.filter(row => 
                        row[primaryDim].value === primaryValue && 
                        row[pivotDim].value === pivotValue
                    );
                    if (matchingRows.length === 0) return 0;
                    return matchingRows.reduce((sum, row) => sum + row[measure.name].value, 0) / matchingRows.length;
                });

                datasets.push({
                    label: `${measure.label} - ${pivotValue}`,
                    data: data,
                    backgroundColor: generateColor(measureIndex * uniquePivotValues.length + pivotIndex),
                    borderColor: generateColor(measureIndex * uniquePivotValues.length + pivotIndex, 1),
                    borderWidth: 1,
                    tension: 0.1,
                    yAxisID: `y${measureIndex}`,
                    type: viewType === 'line' ? 'line' : undefined, // Only set type for line charts
                });
            });
        });

        return { labels: primaryValues, datasets };
    };

    const groupDataByDimension = (rows, dimension, measure) => {
        const groupedData = rows.reduce((acc, row) => {
            const key = row[dimension].value;
            if (!acc[key]) {
                acc[key] = {
                    sum: 0,
                    count: 0
                };
            }
            acc[key].sum += row[measure].value;
            acc[key].count += 1;
            return acc;
        }, {});

        return Object.entries(groupedData).reduce((acc, [key, { sum, count }]) => {
            acc[key] = sum / count;
            return acc;
        }, {});
    };

    const handleDimensionChange = (message, dimensionName, pivotDimension = null) => {
        const response = message.queryResponse;
        const { measures } = response.metadata.fields;

        const processedData = processDataWithPivot(
            response.rows,
            dimensionName,
            pivotDimension,
            measures,
            message.viewType
        );

        setMessages(prevMessages => prevMessages.map(msg =>
            msg === message ? {
                ...msg,
                chartData: processedData,
                currentDimension: dimensionName,
                pivotDimension: pivotDimension
            } : msg
        ));
    };

    const handleSortChange = (message, direction) => {
        const newData = { ...message.chartData };
        const sortMultiplier = direction === 'asc' ? 1 : -1;

        // Calculate total values for each label (sum across all datasets)
        const labelTotals = newData.labels.map((label, index) => ({
            label,
            total: newData.datasets.reduce((sum, dataset) => sum + dataset.data[index], 0),
            originalIndex: index
        }));

        // Sort labels based on totals
        labelTotals.sort((a, b) => (a.total - b.total) * sortMultiplier);

        // Reconstruct the data maintaining all original data points
        const newLabels = labelTotals.map(item => item.label);
        const newDatasets = newData.datasets.map(dataset => ({
            ...dataset,
            data: labelTotals.map(item => dataset.data[item.originalIndex])
        }));

        setMessages(prevMessages => prevMessages.map(msg =>
            msg === message ? {
                ...msg,
                chartData: { ...newData, labels: newLabels, datasets: newDatasets },
                sortDirection: direction
            } : msg
        ));
    };

    const handleViewTypeChange = (message, viewType) => {
        const processedData = processDataWithPivot(
            message.queryResponse.rows,
            message.currentDimension,
            message.pivotDimension,
            message.measures,
            viewType
        );

        setMessages(prevMessages => prevMessages.map(msg =>
            msg === message ? { 
                ...msg, 
                viewType,
                chartData: processedData
            } : msg
        ));
    };

    const summariseJSONResponse = async (json_input) => {
        setIsSummarizing(true);
        try {
            const jsonString = JSON.stringify(json_input, null, 2);
            
            const summaryResponse = await core40SDK.ok(core40SDK.run_inline_query({
                body: {
                    model: 'chatter',
                    view: 'summary_prompt',
                    fields: ['summary_prompt.generated_content'],
                    filters: {
                        'summary_prompt.previous_messages': convertMessagesToBulletList(messages),
                        'summary_prompt.prompt_input': jsonString,
                    },
                },
                result_format: 'json',
            }));
    
            if (summaryResponse && summaryResponse[0]) {
                let generatedContent = summaryResponse[0]["summary_prompt.generated_content"]?.trim();
                
                if (generatedContent) {
                    generatedContent = generatedContent
                        .replace(/[,]/g, '')
                        .replace(/[^\w\s.()?()-]/g, '')
                        .trim();
                    
                    const summaryMessage = { 
                        sender: 'bot', 
                        type: 'text',
                        text: generatedContent 
                    };
                    setMessages(prevMessages => [...prevMessages, summaryMessage]);
                }
            }
        } catch (error) {
            console.error('Error in summariseJSONResponse:', error);
            setMessages(prevMessages => [
                ...prevMessages,
                { 
                    sender: 'bot', 
                    type: 'text',
                    text: 'Error generating summary. Please try again.' 
                }
            ]);
        } finally {
            setIsSummarizing(false);
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim()) return;
    
        const inputClean = input
            .replace(/[,]/g, '') // Remove commas
            .replace(/[^\w\s.()?()-]/g, '') // Remove special characters except for ?, periods, parentheses, and hyphens
            .trim();
        const userMessage = { sender: 'user', text: inputClean };
        
        // Add the new message to the messages array immediately
        setMessages(prevMessages => {
            const newMessages = [...prevMessages, userMessage]; // Add the new user message
            processChatResponse(newMessages); // Process chat response with updated messages
            return newMessages;
        });
    
        setInput('');
    };
    
    const processChatResponse = async (updatedMessages) => {
        try {
            // Update the chat history directly here to include the latest message
            const chatResponse = await core40SDK.ok(core40SDK.run_inline_query({
                body: {
                    model: 'chatter',
                    view: 'chat_prompt',
                    fields: ['chat_prompt.generated_content'],
                    filters: {
                        'chat_prompt.previous_messages': convertMessagesToBulletList(updatedMessages).replace(/,/g, ''),
                        'chat_prompt.prompt_input': input.replace(/,/g, ''),
                    },
                },
                result_format: 'json',
            }));
    
            const generatedContent = chatResponse[0]["chat_prompt.generated_content"].trim();
    
            const botMessage = { sender: 'bot', text: generatedContent };
    
            await runQueryFromJson(generatedContent);
        } catch (error) {
            console.error('Error:', error);
            setMessages(prevMessages => [
                ...prevMessages,
                { sender: 'bot', text: 'Error processing request. Please try again.' }
            ]);
        }
    };

    const runQueryFromJson = async (jsonStringInput) => {
        try {
            const jsonInput = JSON.parse(jsonStringInput);

            const response = await core40SDK.ok(core40SDK.run_inline_query({
                body: {
                    model: jsonInput['query.model'],
                    view: jsonInput['query.view'],
                    fields: jsonInput['query.fields'],
                    filters: jsonInput['query.filters'],
                    limit: jsonInput['query.limit'],
                    sorts: jsonInput['query.sorts'],
                },
                result_format: 'json_bi',
            }));

            const processedData = await processQueryResponse(response);

            if (processedData?.type === 'chart') {
                setMessages(prevMessages => [
                    ...prevMessages,
                    {
                        sender: 'bot',
                        type: 'chart',
                        chartData: processedData.data,
                        dimensions: processedData.dimensions,
                        measures: processedData.measures,
                        currentDimension: processedData.currentDimension,
                        viewType: processedData.viewType,
                        sortDirection: processedData.sortDirection,
                        queryResponse: response,
                        rawData: processedData.rawData
                    }
                ]);
            } else if (processedData?.type === 'text') {
                setMessages(prevMessages => [
                    ...prevMessages,
                    {
                        sender: 'bot',
                        type: 'text',
                        text: JSON.stringify(processedData.data, null, 2)
                    }
                ]);
            }
        } catch (error) {
            console.error('Error:', error);
            setMessages(prevMessages => [
                ...prevMessages,
                { sender: 'bot', text: 'Error processing query. Please try again.' }
            ]);
        }
    };

    const getChartOptions = (measures) => {
        const scales = {
            x: {
                ticks: {
                    maxRotation: 45,
                    minRotation: 45
                }
            }
        };

        // Create separate y-axes for each measure
        measures.forEach((measure, index) => {
            scales[`y${index}`] = {
                type: 'linear',
                display: true,
                position: index === 0 ? 'left' : 'right',
                beginAtZero: true,
                grid: {
                    drawOnChartArea: index === 0,
                },
                title: {
                    display: true,
                    text: measure.label
                },
                ticks: {
                    callback: function(value) {
                        return value.toLocaleString();
                    }
                }
            };
        });

        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    align: 'start',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        boxWidth: 10,
                    }
                },
                title: {
                    display: true,
                    text: 'Data Visualization',
                    padding: {
                        top: 10,
                        bottom: 20
                    },
                    font: {
                        size: 16
                    }
                }
            },
            scales
        };
    };

    const DataTable = ({ data, dimensions, measures, pivotDimension }) => {
        // If there's no pivot dimension, render the regular table
        if (!pivotDimension) {
            return (
                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                {dimensions.map(dim => (
                                    <th key={dim.name} style={styles.tableHeader}>{dim.label}</th>
                                ))}
                                {measures.map(measure => (
                                    <th key={measure.name} style={styles.tableHeader}>{measure.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, index) => (
                                <tr key={index}>
                                    {dimensions.map(dim => (
                                        <td key={dim.name} style={styles.tableCell}>{row[dim.name].value}</td>
                                    ))}
                                    {measures.map(measure => (
                                        <td key={measure.name} style={styles.tableCell}>
                                            {row[measure.name].value.toLocaleString()}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

        // Create pivoted table structure
        const primaryDimension = dimensions.find(d => d.name !== pivotDimension);
        const primaryValues = [...new Set(data.map(row => row[primaryDimension.name].value))].sort();
        const pivotValues = [...new Set(data.map(row => row[pivotDimension].value))].sort();

        // Create a lookup for cell values and calculate min/max for heatmap
        const cellLookup = {};
        let minValue = Infinity;
        let maxValue = -Infinity;

        data.forEach(row => {
            const primaryKey = row[primaryDimension.name].value;
            const pivotKey = row[pivotDimension].value;
            
            measures.forEach(measure => {
                const value = row[measure.name].value;
                cellLookup[`${primaryKey}-${pivotKey}-${measure.name}`] = value;
                minValue = Math.min(minValue, value);
                maxValue = Math.max(maxValue, value);
            });
        });

        // Function to get cell background color for heatmap
        const getCellBackground = (value) => {
            const percentage = (value - minValue) / (maxValue - minValue);
            return `rgba(0, 0, 255, ${percentage * 0.5})`; // Blue heatmap
        };

        return (
            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.tableHeader}>{primaryDimension.label}</th>
                            {pivotValues.map(pivotValue => (
                                measures.map(measure => (
                                    <th key={`${pivotValue}-${measure.name}`} style={styles.tableHeader}>
                                        {`${pivotValue} - ${measure.label}`}
                                    </th>
                                ))
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {primaryValues.map(primaryValue => (
                            <tr key={primaryValue}>
                                <td style={styles.tableCell}>{primaryValue}</td>
                                {pivotValues.map(pivotValue => (
                                    measures.map(measure => {
                                        const value = cellLookup[`${primaryValue}-${pivotValue}-${measure.name}`] || 0;
                                        return (
                                            <td 
                                                key={`${pivotValue}-${measure.name}`} 
                                                style={{
                                                    ...styles.tableCell,
                                                    backgroundColor: getCellBackground(value)
                                                }}
                                            >
                                                {value.toLocaleString()}
                                            </td>
                                        );
                                    })
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const ChartControls = ({ message, onDimensionChange, onSortChange, onViewTypeChange }) => (
        <div style={styles.chartControls}>
            {message.dimensions && message.dimensions.length > 1 && (
                <>
                    <div style={styles.controlGroup}>
                        <label style={styles.controlLabel}>Primary Dimension:</label>
                        <select
                            value={message.currentDimension}
                            onChange={(e) => onDimensionChange(message, e.target.value, message.pivotDimension)}
                            style={styles.select}
                        >
                            {message.dimensions.map((dim) => (
                                <option key={dim.name} value={dim.name}>
                                    {dim.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div style={styles.controlGroup}>
                        <label style={styles.controlLabel}>Pivot By:</label>
                        <select
                            value={message.pivotDimension || ''}
                            onChange={(e) => onDimensionChange(message, message.currentDimension, e.target.value || null)}
                            style={styles.select}
                        >
                            <option value="">No Pivot</option>
                            {message.dimensions
                                .filter(dim => dim.name !== message.currentDimension)
                                .map((dim) => (
                                    <option key={dim.name} value={dim.name}>
                                        {dim.label}
                                    </option>
                                ))
                            }
                        </select>
                    </div>
                </>
            )}
            <div style={styles.controlGroup}>
                <label style={styles.controlLabel}>Sort:</label>
                <select
                    value={message.sortDirection}
                    onChange={(e) => onSortChange(message, e.target.value)}
                    style={styles.select}
                >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                </select>
            </div>
            <div style={styles.controlGroup}>
                <label style={styles.controlLabel}>View Type:</label>
                <select
                    value={message.viewType}
                    onChange={(e) => onViewTypeChange(message, e.target.value)}
                    style={styles.select}
                >
                    <option value="table">Table</option>
                    <option value="bar">Bar Chart</option>
                    <option value="line">Line Chart</option>
                </select>
            </div>
        </div>
    );

    const MessageContent = ({ message }) => {
        if (message.type === 'chart') {
            if (message.viewType === 'table') {
                return (
                    <div style={styles.chartContainer}>
                        <ChartControls
                            message={message}
                            onDimensionChange={handleDimensionChange}
                            onSortChange={handleSortChange}
                            onViewTypeChange={handleViewTypeChange}
                        />
                        <DataTable 
                            data={message.rawData}
                            dimensions={message.dimensions}
                            measures={message.measures}
                            pivotDimension={message.pivotDimension}
                        />
                    </div>
                );
            } else {
                const ChartComponent = message.viewType === 'line' ? Line : Bar;
                return (
                    <div style={styles.chartContainer}>
                        <ChartControls
                            message={message}
                            onDimensionChange={handleDimensionChange}
                            onSortChange={handleSortChange}
                            onViewTypeChange={handleViewTypeChange}
                        />
                        <div style={styles.messageChart}>
                            <ChartComponent 
                                data={message.chartData} 
                                options={getChartOptions(message.measures)} 
                            />
                        </div>
                    </div>
                );
            }
        }
        return (
            <>
                <pre style={styles.preformatted}>{message.text}</pre>
                {isSummarizing && message.sender === 'bot' && message.type === 'text' && (
                    <div style={styles.loadingSpinner}>
                        <Loader className="animate-spin" size={16} />
                        <span>Generating summary...</span>
                    </div>
                )}
            </>
        );
    };

    return (
        <div style={styles.chatBotContainer}>
            <div style={styles.chatMessages}>
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        style={{
                            ...styles.message,
                            alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                            backgroundColor: msg.sender === 'user' ? '#d1f4ff' : '#f4f4f4',
                            width: msg.type === 'chart' ? '90%' : 'auto',
                            maxWidth: msg.type === 'chart' ? '90%' : '60%',
                        }}
                    >
                        <MessageContent message={msg} />
                    </div>
                ))}
            </div>
            <div style={styles.inputSection}>
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                        }
                    }}
                    style={styles.input}
                    placeholder="Type your message..."
                />
                <button 
                    onClick={handleSendMessage} 
                    style={styles.button}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <Loader className="animate-spin" size={16} />
                    ) : (
                        'Send'
                    )}
                </button>
            </div>
        </div>
    );
};

const styles = {
    chatBotContainer: {
        display: 'flex',
        flexDirection: 'column',
        height: '80%',
        width: '90%',
        border: '1px solid #ccc',
        borderRadius: '8px',
        overflow: 'hidden',
        fontFamily: 'Arial, sans-serif',
        position: 'absolute',
        left: '5%',
        backgroundColor: '#fff',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    },
    chatMessages: {
        height: '70vh',
        width: '100%',
        flex: 1,
        padding: '10px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        backgroundColor: '#fafafa',
    },
    chartContainer: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    },
    chartControls: {
        display: 'flex',
        gap: '15px',
        padding: '10px',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        marginBottom: '10px',
        flexWrap: 'wrap',
    },
    controlGroup: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        minWidth: '180px',
    },
    controlLabel: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#444',
        whiteSpace: 'nowrap',
    },
    select: {
        padding: '6px 10px',
        borderRadius: '4px',
        border: '1px solid #ddd',
        backgroundColor: '#fff',
        fontSize: '13px',
        color: '#333',
        cursor: 'pointer',
        minWidth: '100px',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M3 5h6L6 9z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
        backgroundSize: '12px',
        transition: 'all 0.2s ease',
        flex: 1,
    },
    messageChart: {
        height: '300px',
        width: '100%',
        padding: '8px',
    },
    message: {
        padding: '8px 12px',
        borderRadius: '8px',
        fontSize: '13px',
        marginBottom: '4px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    },
    inputSection: {
        display: 'flex',
        padding: '12px',
        borderTop: '1px solid #eee',
        backgroundColor: '#fff',
        gap: '8px',
    },
    input: {
        flex: 1,
        padding: '8px 12px',
        fontSize: '13px',
        borderRadius: '4px',
        border: '1px solid #ddd',
        minHeight: '24px',
        maxHeight: '80px',
        resize: 'none',
        overflow: 'auto',
        transition: 'border-color 0.2s ease',
    },
    button: {
        padding: '8px 16px',
        fontSize: '13px',
        borderRadius: '4px',
        backgroundColor: '#007BFF',
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
    },
    preformatted: {
        margin: 0,
        whiteSpace: 'pre-wrap',
        fontSize: '13px',
        fontFamily: 'monospace',
    },
    tableContainer: {
        width: '100%',
        overflowX: 'auto',
        marginTop: '8px',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '13px',
    },
    tableHeader: {
        padding: '8px 12px',
        backgroundColor: '#f8f9fa',
        borderBottom: '2px solid #dee2e6',
        textAlign: 'left',
        fontWeight: '600',
        whiteSpace: 'nowrap',
    },
    tableCell: {
        padding: '6px 12px',
        borderBottom: '1px solid #dee2e6',
        whiteSpace: 'nowrap',
    },
    loadingSpinner: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12px',
        color: '#666',
        marginTop: '8px'
    },
};

export default ChatBot;