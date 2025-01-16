import React, { useEffect, useState, useContext } from 'react';
import { ExtensionContext } from '@looker/extension-sdk-react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';

// Register Chart.js components
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
        return messages
            .map((item) => {
                if (item.sender === "bot") {
                    try {
                        const parsed = JSON.parse(item.text);
                        return `- Bot: ${parsed[0]["prompt.generated_content"].trim()}`;
                    } catch (error) {
                        return `- Bot: ${item.text}`;
                    }
                } else {
                    return `- User: ${item.text}`;
                }
            })
            .join("\n");
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

    const groupDataByDimension = (rows, dimension, measure) => {
        // Group data and calculate averages
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

        // Calculate averages
        return Object.entries(groupedData).reduce((acc, [key, { sum, count }]) => {
            acc[key] = sum / count;
            return acc;
        }, {});
    };

    const processQueryResponse = (response) => {
        if (!response || !response.metadata || !response.rows) {
            console.error('Invalid response structure');
            return null;
        }

        const { dimensions, measures } = response.metadata.fields;
        
        if (!dimensions || !measures || dimensions.length === 0 || measures.length === 0) {
            console.error('No dimensions or measures found');
            return null;
        }

        const primaryDimension = dimensions[0].name;
        const measureName = measures[0].name;

        // Group data by primary dimension
        const groupedData = groupDataByDimension(response.rows, primaryDimension, measureName);
        const labels = Object.keys(groupedData);
        const values = Object.values(groupedData);

        if (dimensions.length > 1) {
            const secondaryDimension = dimensions[1].name;
            const secondaryValues = [...new Set(response.rows.map(row => row[secondaryDimension].value))];
            
            const datasets = secondaryValues.map((secondaryValue, index) => {
                const filteredRows = response.rows.filter(row => row[secondaryDimension].value === secondaryValue);
                const groupedSecondaryData = groupDataByDimension(filteredRows, primaryDimension, measureName);
                const data = labels.map(label => groupedSecondaryData[label] || 0);

                return {
                    label: secondaryValue.toString(),
                    data,
                    backgroundColor: generateColor(index),
                    borderColor: generateColor(index, 1),
                    borderWidth: 1,
                    tension: 0.1
                };
            });

            return {
                type: 'chart',
                data: { labels, datasets },
                dimensions: dimensions,
                measures: measures,
                currentDimension: primaryDimension,
                chartType: 'bar',
                sortDirection: 'asc'
            };
        } else {
            const datasets = [{
                label: measures[0].label,
                data: values,
                backgroundColor: generateColor(0),
                borderColor: generateColor(0, 1),
                borderWidth: 1,
                tension: 0.1
            }];

            return {
                type: 'chart',
                data: { labels, datasets },
                dimensions: dimensions,
                measures: measures,
                currentDimension: primaryDimension,
                chartType: 'bar',
                sortDirection: 'asc'
            };
        }
    };

    const handleDimensionChange = (message, dimensionName) => {
        const response = message.queryResponse;
        const { dimensions } = response.metadata.fields;
        const measureName = response.metadata.fields.measures[0].name;
        
        // Regroup data based on new primary dimension
        const groupedData = groupDataByDimension(response.rows, dimensionName, measureName);
        const labels = Object.keys(groupedData);
        const otherDimension = dimensions.find(d => d.name !== dimensionName)?.name;

        let datasets;
        if (otherDimension) {
            const secondaryValues = [...new Set(response.rows.map(row => row[otherDimension].value))];
            datasets = secondaryValues.map((secondaryValue, index) => {
                const filteredRows = response.rows.filter(row => row[otherDimension].value === secondaryValue);
                const groupedSecondaryData = groupDataByDimension(filteredRows, dimensionName, measureName);
                const data = labels.map(label => groupedSecondaryData[label] || 0);

                return {
                    label: secondaryValue.toString(),
                    data,
                    backgroundColor: generateColor(index),
                    borderColor: generateColor(index, 1),
                    borderWidth: 1,
                    tension: 0.1
                };
            });
        } else {
            datasets = [{
                label: response.metadata.fields.measures[0].label,
                data: Object.values(groupedData),
                backgroundColor: generateColor(0),
                borderColor: generateColor(0, 1),
                borderWidth: 1,
                tension: 0.1
            }];
        }

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

        // Get the first dataset's values for sorting
        const sortValues = newData.datasets[0].data;
        
        // Create array of label-value pairs for sorting
        const pairs = newData.labels.map((label, index) => ({
            label,
            values: newData.datasets.map(ds => ds.data[index])
        }));

        // Sort pairs based on the first dataset's values
        pairs.sort((a, b) => (a.values[0] - b.values[0]) * sortMultiplier);

        // Reconstruct labels and datasets
        newData.labels = pairs.map(pair => pair.label);
        newData.datasets = newData.datasets.map(dataset => ({
            ...dataset,
            data: pairs.map(pair => pair.values[dataset.data.indexOf(pair.values[0])])
        }));

        setMessages(prevMessages => prevMessages.map(msg =>
            msg === message ? {
                ...msg,
                chartData: newData,
                sortDirection: direction
            } : msg
        ));
    };

    const handleChartTypeChange = (message, chartType) => {
        setMessages(prevMessages => prevMessages.map(msg =>
            msg === message ? { ...msg, chartType } : msg
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
                        'chat_prompt.previous_messages': convertMessagesToBulletList(messages),
                        'chat_prompt.prompt_input': input,
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
                        chartType: processedData.chartType,
                        sortDirection: processedData.sortDirection,
                        queryResponse: response
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

    const chartOptions = {
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
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function(value) {
                        return value.toLocaleString();
                    }
                }
            },
            x: {
                ticks: {
                    maxRotation: 45,
                    minRotation: 45
                }
            }
        }
    };

    const ChartControls = ({ message, onDimensionChange, onSortChange, onChartTypeChange }) => (
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
                <label style={styles.controlLabel}>Chart Type:</label>
                <select
                    value={message.chartType}
                    onChange={(e) => onChartTypeChange(message, e.target.value)}
                    style={styles.select}
                >
                    <option value="bar">Bar Chart</option>
                    <option value="line">Line Chart</option>
                </select>
            </div>
        </div>
    );

    const MessageContent = ({ message }) => {
        if (message.type === 'chart' && message.chartData) {
            const ChartComponent = message.chartType === 'line' ? Line : Bar;
            return (
                <div style={styles.chartContainer}>
                    <ChartControls
                        message={message}
                        onDimensionChange={handleDimensionChange}
                        onSortChange={handleSortChange}
                        onChartTypeChange={handleChartTypeChange}
                    />
                    <div style={styles.messageChart}>
                        <ChartComponent data={message.chartData} options={chartOptions} />
                    </div>
                </div>
            );
        }
        return <div>{message.text}</div>;
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
                            width: msg.type === 'chart' ? '80%' : undefined,
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
        height: '70%',
        width: '80%',
        border: '1px solid #ccc',
        borderRadius: '8px',
        overflow: 'hidden',
        fontFamily: 'Arial, sans-serif',
        position: 'absolute',
        left: '10%',
        backgroundColor: '#fff',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    },
    chatMessages: {
        height: '60vh',
        width: '100%',
        flex: 1,
        padding: '10px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        backgroundColor: '#fafafa',
    },
    chartContainer: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '15px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    },
    chartControls: {
        display: 'flex',
        gap: '20px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        marginBottom: '15px',
        flexWrap: 'wrap',
    },
    controlGroup: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        minWidth: '200px',
    },
    controlLabel: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#444',
        whiteSpace: 'nowrap',
    },
    select: {
        padding: '8px 12px',
        borderRadius: '6px',
        border: '1px solid #ddd',
        backgroundColor: '#fff',
        fontSize: '14px',
        color: '#333',
        cursor: 'pointer',
        minWidth: '120px',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M3 5h6L6 9z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        backgroundSize: '12px',
        transition: 'all 0.2s ease',
        flex: 1,
    },
    messageChart: {
        height: '300px',
        width: '100%',
        padding: '10px',
    },
    message: {
        maxWidth: '60%',
        padding: '8px 12px',
        borderRadius: '12px',
        fontSize: '14px',
        marginBottom: '10px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    },
    inputSection: {
        display: 'flex',
        padding: '15px',
        borderTop: '1px solid #eee',
        backgroundColor: '#fff',
        gap: '10px',
    },
    input: {
        flex: 1,
        padding: '12px',
        fontSize: '14px',
        borderRadius: '6px',
        border: '1px solid #ddd',
        minHeight: '30px',
        resize: 'none',
        overflow: 'auto',
        transition: 'border-color 0.2s ease',
        '&:focus': {
            outline: 'none',
            borderColor: '#007bff',
            boxShadow: '0 0 0 2px rgba(0,123,255,0.25)',
        },
    },
    button: {
        padding: '8px 16px',
        fontSize: '14px',
        borderRadius: '6px',
        backgroundColor: '#007BFF',
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
        '&:hover': {
            backgroundColor: '#0056b3',
        },
        '&:active': {
            backgroundColor: '#004085',
        },
    }
};

export default ChatBot;