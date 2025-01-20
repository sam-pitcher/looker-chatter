import React, { useEffect, useState, useContext } from 'react';
import { ExtensionContext } from '@looker/extension-sdk-react';
import { Bar, Line } from 'react-chartjs-2';
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
    const { core40SDK } = useContext(ExtensionContext);

    const convertMessagesToBulletList = (messages) => {
        const bulletMessages = messages
        .map((item) => {
            if (item.sender === "user") {
                return `- User: ${item.text}`;
            }
        })
        .join("\n");
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

        const { dimensions, measures } = response.metadata.fields;

        // If no dimensions, return the raw response
        if (!dimensions || dimensions.length === 0) {
            return {
                type: 'text',
                data: response.rows
            };
        }

        const primaryDimension = dimensions[0].name;
        
        // Handle multiple measures with separate y-axes
        const datasets = measures.map((measure, measureIndex) => {
            const measureName = measure.name;
            const groupedData = groupDataByDimension(response.rows, primaryDimension, measureName);
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

        const labels = Object.keys(groupDataByDimension(response.rows, primaryDimension, measures[0].name));

        return {
            type: 'chart',
            data: { labels, datasets },
            dimensions: dimensions,
            measures: measures,
            currentDimension: primaryDimension,
            viewType: 'bar',
            sortDirection: 'asc',
            rawData: response.rows
        };
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

    const handleDimensionChange = (message, dimensionName) => {
        const response = message.queryResponse;
        const { measures } = response.metadata.fields;

        const labels = [...new Set(response.rows.map(row => row[dimensionName].value))];
        
        const datasets = measures.map((measure, measureIndex) => {
            const groupedData = groupDataByDimension(response.rows, dimensionName, measure.name);
            const data = labels.map(label => groupedData[label] || 0);

            return {
                label: measure.label,
                data,
                backgroundColor: generateColor(measureIndex),
                borderColor: generateColor(measureIndex, 1),
                borderWidth: 1,
                tension: 0.1,
                yAxisID: `y${measureIndex}`
            };
        });

        const updatedChartData = { labels, datasets };
        setMessages(prevMessages => prevMessages.map(msg =>
            msg === message ? {
                ...msg,
                chartData: updatedChartData,
                currentDimension: dimensionName
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
        setMessages(prevMessages => prevMessages.map(msg =>
            msg === message ? { ...msg, viewType } : msg
        ));
    };

    const handleSendMessage = async () => {
        if (!input.trim()) return;

        const userMessage = { sender: 'user', text: input };
        setMessages(prevMessages => [...prevMessages, userMessage]);

        try {
            const chatResponse = await core40SDK.ok(core40SDK.run_inline_query({
                body: {
                    model: 'chatter',
                    view: 'chat_prompt',
                    fields: ['chat_prompt.generated_content'],
                    filters: {
                        'chat_prompt.previous_messages': convertMessagesToBulletList(messages).replace(/,/g, ''),
                        'chat_prompt.prompt_input': input.replace(/,/g, ''),
                    },
                },
                result_format: 'json',
            }));

            const generatedContent = chatResponse[0]["chat_prompt.generated_content"].trim();

            const botMessage = { sender: 'bot', text: generatedContent };
            setMessages(prevMessages => [...prevMessages, botMessage]);

            await runQueryFromJson(generatedContent);
        } catch (error) {
            console.error('Error:', error);
            setMessages(prevMessages => [
                ...prevMessages,
                { sender: 'bot', text: 'Error processing request. Please try again.' }
            ]);
        }

        setInput('');
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

            const processedData = processQueryResponse(response);

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

    const DataTable = ({ data, dimensions, measures }) => (
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

    const ChartControls = ({ message, onDimensionChange, onSortChange, onViewTypeChange }) => (
        <div style={styles.chartControls}>
            {message.dimensions && message.dimensions.length > 1 && (
                <div style={styles.controlGroup}>
                    <label style={styles.controlLabel}>Primary Dimension:</label>
                    <select
                        value={message.currentDimension}
                        onChange={(e) => onDimensionChange(message, e.target.value)}
                        style={styles.select}
                    >
                        {message.dimensions.map((dim) => (
                            <option key={dim.name} value={dim.name}>
                                {dim.label}
                            </option>
                        ))}
                    </select>
                </div>
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
        return <pre style={styles.preformatted}>{message.text}</pre>;
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
                <button onClick={handleSendMessage} style={styles.button}>
                    Send
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
    }
};

export default ChatBot;