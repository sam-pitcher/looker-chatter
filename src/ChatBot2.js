// import React, { useEffect, useState, useContext } from 'react';
// import { ExtensionContext } from '@looker/extension-sdk-react';
// import { Bar, Line } from 'react-chartjs-2';
// import { Loader } from 'lucide-react';
// import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
// import { styles } from './styles'

// ChartJS.register(
//     CategoryScale,
//     LinearScale,
//     BarElement,
//     LineElement,
//     PointElement,
//     Title,
//     Tooltip,
//     Legend
// );

// const ChatBot = () => {
//     const [selectedModel, setSelectedModel] = useState('');
//     const [selectedExplore, setSelectedExplore] = useState('');
//     const [models, setModels] = useState([]);
//     const [explores, setExplores] = useState([]);
//     const [messages, setMessages] = useState([]);
//     const [input, setInput] = useState('');
//     const [selectedSortMeasure, setSelectedSortMeasure] = useState('');
//     const [isSummarizing, setIsSummarizing] = useState(false);
//     const { core40SDK } = useContext(ExtensionContext);

//     useEffect(() => {
//         const fetchModels = async () => {
//             try {
//                 const allModels = await core40SDK.ok(core40SDK.all_lookml_models({ fields: "" }));
//                 setModels(allModels);
//             } catch (error) {
//                 console.error('Error fetching LookML models:', error);
//             }
//         };
//         fetchModels();
//     }, []);

//     useEffect(() => {
//         const fetchExplores = async () => {
//             if (selectedModel) {
//                 try {
//                     const model = await core40SDK.ok(core40SDK.lookml_model(selectedModel));
//                     setExplores(model.explores);
//                 } catch (error) {
//                     console.error('Error fetching explores for model:', error);
//                 }
//             }
//         };
//         fetchExplores();
//     }, [selectedModel]);

//     const convertMessagesToBulletList = (messages) => {
//         const bulletMessages = messages
//             .map((item) => {
//                 return `- ${item.sender}: ${item.text}`
//             })
//             .join("\n");
//         console.log("Messages: ", bulletMessages)
//         return bulletMessages;
//     };

//     function extractJson(input) {
//         const jsonRegex = /{.*}/s; // Matches everything between the first and last curly braces
//         const match = input.match(jsonRegex);
//         return match ? match[0] : null;
//     }

//     const generateColor = (index, alpha = 0.2) => {
//         const colors = [
//             `rgba(255, 99, 132, ${alpha})`,
//             `rgba(54, 162, 235, ${alpha})`,
//             `rgba(255, 206, 86, ${alpha})`,
//             `rgba(75, 192, 192, ${alpha})`,
//             `rgba(153, 102, 255, ${alpha})`,
//             `rgba(255, 159, 64, ${alpha})`
//         ];
//         return colors[index % colors.length];
//     };

//     const processQueryResponse = (response) => {
//         if (!response || !response.metadata || !response.rows) {
//             console.error('Invalid response structure');
//             return null;
//         }

//         const rowsJSONString = JSON.stringify(response.rows)
//             .replace(/\\u0027/g, "'")
//             .replace(/\\/g, "")
//             .replace(/"/g, "'");
//         summariseJSONResponse(rowsJSONString);

//         const { dimensions, measures } = response.metadata.fields;

//         // Case 1: Only measures - return null to just show summary
//         if ((!dimensions || dimensions.length === 0) && measures && measures.length > 0) {
//             return null;
//         }

//         // Case 2: Only dimensions - return table view
//         if ((!measures || measures.length === 0) && dimensions && dimensions.length > 0) {
//             return {
//                 type: 'table',
//                 data: response.rows,
//                 dimensions: dimensions
//             };
//         }

//         // Case 3: One or more dimensions and measures
//         const processedData = processDataWithDimensions(response.rows, dimensions, measures);
//         return {
//             type: 'chart',
//             data: processedData,
//             dimensions: dimensions,
//             measures: measures,
//             viewType: 'bar', // Default view type
//             sortDirection: 'asc',
//             rawData: response.rows
//         };
//     };

//     const processWithSingleDimension = (rows, dimension, measures) => {
//         const labels = [...new Set(rows.map(row => row[dimension.name].value))];

//         const datasets = measures.map((measure, index) => ({
//             label: measure.label,
//             data: labels.map(label => {
//                 const matchingRow = rows.find(row => row[dimension.name].value === label);
//                 return matchingRow ? matchingRow[measure.name].value : 0;
//             }),
//             backgroundColor: generateColor(index),
//             borderColor: generateColor(index, 1),
//             borderWidth: 1,
//             tension: 0.1,
//             yAxisID: `y${index}`,
//             type: 'bar' // Default to bar, can be changed to line
//         }));

//         return { labels, datasets };
//     };

//     const processWithMultipleDimensions = (rows, dimensions, measures, pivotDimension = null) => {
//         if (pivotDimension) {
//             // Handle pivoted view
//             const nonPivotDimensions = dimensions.filter(d => d.name !== pivotDimension);
//             const concatenatedLabels = [...new Set(rows.map(row =>
//                 nonPivotDimensions.map(dim => row[dim.name].value).join(' - ')
//             ))];

//             const pivotValues = [...new Set(rows.map(row => row[pivotDimension].value))];

//             const datasets = [];
//             measures.forEach((measure, measureIndex) => {
//                 pivotValues.forEach((pivotValue, pivotIndex) => {
//                     const data = concatenatedLabels.map(label => {
//                         const matchingRow = rows.find(row =>
//                             nonPivotDimensions.map(dim => row[dim.name].value).join(' - ') === label &&
//                             row[pivotDimension].value === pivotValue
//                         );
//                         return matchingRow ? matchingRow[measure.name].value : 0;
//                     });

//                     datasets.push({
//                         label: `${measure.label} - ${pivotValue}`,
//                         data: data,
//                         backgroundColor: generateColor(measureIndex * pivotValues.length + pivotIndex),
//                         borderColor: generateColor(measureIndex * pivotValues.length + pivotIndex, 1),
//                         borderWidth: 1,
//                         tension: 0.1,
//                         yAxisID: `y${measureIndex}`,
//                         stack: measure.label // Stack by measure
//                     });
//                 });
//             });

//             return { labels: concatenatedLabels, datasets };
//         } else {
//             // Handle concatenated view without pivot
//             const concatenatedLabels = [...new Set(rows.map(row =>
//                 dimensions.map(dim => row[dim.name].value).join(' - ')
//             ))];

//             const datasets = measures.map((measure, index) => ({
//                 label: measure.label,
//                 data: concatenatedLabels.map(label => {
//                     const matchingRow = rows.find(row =>
//                         dimensions.map(dim => row[dim.name].value).join(' - ') === label
//                     );
//                     return matchingRow ? matchingRow[measure.name].value : 0;
//                 }),
//                 backgroundColor: generateColor(index),
//                 borderColor: generateColor(index, 1),
//                 borderWidth: 1,
//                 tension: 0.1,
//                 yAxisID: `y${index}`
//             }));

//             return { labels: concatenatedLabels, datasets };
//         }
//     };

//     const processDataWithDimensions = (rows, dimensions, measures, pivotDimension = null) => {
//         // If there's only one dimension, use it directly
//         if (dimensions.length === 1) {
//             return processWithSingleDimension(rows, dimensions[0], measures);
//         }

//         // For multiple dimensions, handle concatenation and pivoting
//         return processWithMultipleDimensions(rows, dimensions, measures, pivotDimension);
//     };

//     const handleDimensionChange = (message, dimensionName, pivotDimension = null) => {
//         const response = message.queryResponse;
//         const { dimensions, measures } = response.metadata.fields;

//         const processedData = processDataWithDimensions(
//             response.rows,
//             dimensions,
//             measures,
//             pivotDimension
//         );

//         setMessages(prevMessages => prevMessages.map(msg =>
//             msg === message ? {
//                 ...msg,
//                 chartData: processedData,
//                 currentDimension: dimensionName,
//                 pivotDimension: pivotDimension
//             } : msg
//         ));
//     };

//     const handleSortChange = (message, direction) => {
//         const newData = { ...message.chartData };
//         const sortMeasure = selectedSortMeasure || message.measures[0]?.name;
//         const sortMultiplier = direction === 'asc' ? 1 : -1;

//         // Handle pivot case
//         if (message.pivotDimension) {
//             // When pivoted, we only sort the concatenated labels alphabetically
//             const sortablePairs = newData.labels.map((label, index) => ({
//                 label,
//                 originalIndex: index
//             }));

//             // Sort the pairs alphabetically
//             sortablePairs.sort((a, b) => (
//                 a.label.localeCompare(b.label) * sortMultiplier
//             ));

//             // Reconstruct labels and datasets in the new order
//             const newLabels = sortablePairs.map(pair => pair.label);
//             const newDatasets = newData.datasets.map(dataset => ({
//                 ...dataset,
//                 data: sortablePairs.map(pair => dataset.data[pair.originalIndex])
//             }));

//             setMessages(prevMessages => prevMessages.map(msg =>
//                 msg === message ? {
//                     ...msg,
//                     chartData: { ...newData, labels: newLabels, datasets: newDatasets },
//                     sortDirection: direction
//                 } : msg
//             ));
//         } else {
//             // Non-pivoted case: can sort by any measure
//             const sortDataset = newData.datasets.find(dataset =>
//                 dataset.label === sortMeasure || dataset.label.includes(sortMeasure)
//             );

//             if (!sortDataset) return;

//             // Create array of label/data pairs for sorting
//             const sortablePairs = newData.labels.map((label, index) => ({
//                 label,
//                 value: sortDataset.data[index],
//                 originalIndex: index
//             }));

//             // Sort the pairs
//             sortablePairs.sort((a, b) => (a.value - b.value) * sortMultiplier);

//             // Reconstruct labels and datasets in the new order
//             const newLabels = sortablePairs.map(pair => pair.label);
//             const newDatasets = newData.datasets.map(dataset => ({
//                 ...dataset,
//                 data: sortablePairs.map(pair => dataset.data[pair.originalIndex])
//             }));

//             setMessages(prevMessages => prevMessages.map(msg =>
//                 msg === message ? {
//                     ...msg,
//                     chartData: { ...newData, labels: newLabels, datasets: newDatasets },
//                     sortDirection: direction
//                 } : msg
//             ));
//         }
//     };

//     const handleViewTypeChange = (message, viewType) => {
//         setMessages(prevMessages => prevMessages.map(msg =>
//             msg === message ? {
//                 ...msg,
//                 viewType,
//                 // Keep the existing chartData structure
//                 chartData: {
//                     ...msg.chartData,
//                     datasets: msg.chartData.datasets.map(dataset => ({
//                         ...dataset,
//                         type: viewType // Update the type for each dataset
//                     }))
//                 }
//             } : msg
//         ));
//     };

//     // Function that summarises response from runQueryFromJson
//     const summariseJSONResponse = async (json_input) => {
//         // setIsSummarizing(true);
//         try {
//             const jsonString = JSON.stringify(json_input, null, 2);
//             const singleLineBulletList = convertMessagesToBulletList(messages).replace(/,/g, '').replace(/\r?\n|\r/g, ' ');
//             const summaryResponse = await core40SDK.ok(core40SDK.run_inline_query({
//                 body: {
//                     model: 'chatter',
//                     view: 'summary_prompt',
//                     fields: ['summary_prompt.generated_content'],
//                     filters: {
//                         'summary_prompt.previous_messages': `'${singleLineBulletList}'`,
//                         'summary_prompt.prompt_input': jsonString,
//                     },
//                 },
//                 result_format: 'json',
//             }));

//             if (summaryResponse && summaryResponse[0]) {
//                 let generatedContent = summaryResponse[0]["summary_prompt.generated_content"]?.trim();

//                 if (generatedContent) {
//                     generatedContent = generatedContent
//                         .replace(/[,]/g, '')
//                         .replace(/[^\w\s.()?()-]/g, '')
//                         .trim();

//                     const summaryMessage = {
//                         sender: 'bot',
//                         type: 'text',
//                         text: generatedContent
//                     };
//                     setMessages(prevMessages => [...prevMessages, summaryMessage]);
//                 }
//             }
//         } catch (error) {
//             console.error('Error in summariseJSONResponse:', error);
//             setMessages(prevMessages => [
//                 ...prevMessages,
//                 {
//                     sender: 'bot',
//                     type: 'text',
//                     text: 'Error generating summary. Please try again.'
//                 }
//             ]);
//         } finally {
//             setIsSummarizing(false);
//         }
//     };

//     const handleSendMessage = async () => {
//         if (!selectedModel || !selectedExplore) {
//             alert('Please select a Model and Explore before sending a message.');
//             return;
//         }

//         if (!input.trim()) return;

//         setIsSummarizing(true);

//         const inputClean = input
//             .replace(/[,]/g, '') // Remove commas
//             .replace(/[^\w\s.()?()-]/g, '') // Remove special characters except for ?, periods, parentheses, and hyphens
//             .trim();
//         const userMessage = { sender: 'user', text: inputClean };

//         // Add the new message to the messages array immediately
//         setMessages(prevMessages => {
//             const newMessages = [...prevMessages, userMessage]; // Add the new user message
//             processChatResponse(newMessages); // Process chat response with updated messages
//             return newMessages;
//         });

//         setInput('');
//     };

//     const processChatResponse = async (updatedMessages) => {
//         try {
//             // Update the chat history directly here to include the latest message
//             const singleLineBulletList = convertMessagesToBulletList(updatedMessages).replace(/,/g, '').replace(/\r?\n|\r/g, ' ');
//             console.log('singleLineBulletList: ', singleLineBulletList)
//             const chatResponse = await core40SDK.ok(core40SDK.run_inline_query({
//                 body: {
//                     model: 'chatter',
//                     view: 'chat_prompt',
//                     fields: ['chat_prompt.generated_content'],
//                     filters: {
//                         'chat_prompt.previous_messages': `'${singleLineBulletList}'`,
//                         'chat_prompt.prompt_input': input.replace(/,/g, ''),
//                         'chat_prompt.model': `'${selectedModel}'`,
//                         'chat_prompt.explore': `'${selectedExplore}'`
//                     },
//                 },
//                 result_format: 'json',
//             }));

//             const generatedContent = chatResponse[0]["chat_prompt.generated_content"].trim();
//             const cleanGeneratedContent = extractJson(generatedContent);

//             await runQueryFromJson(cleanGeneratedContent);
//         } catch (error) {
//             console.error('Error:', error);
//             setMessages(prevMessages => [
//                 ...prevMessages,
//                 { sender: 'bot', text: 'Error processing request. Please try again.' }
//             ]);
//         }
//     };

//     const runQueryFromJson = async (jsonStringInput) => {
//         console.log("Looker JSON: ", jsonStringInput)
//         try {
//             const jsonInput = JSON.parse(jsonStringInput);

//             const response = await core40SDK.ok(core40SDK.run_inline_query({
//                 body: {
//                     model: jsonInput['query.model'],
//                     view: jsonInput['query.view'],
//                     fields: jsonInput['query.fields'],
//                     filters: jsonInput['query.filters'],
//                     limit: jsonInput['query.limit'],
//                     sorts: jsonInput['query.sorts'],
//                 },
//                 result_format: 'json_bi',
//             }));

//             const processedData = await processQueryResponse(response);

//             if (processedData?.type === 'chart') {
//                 setMessages(prevMessages => [
//                     ...prevMessages,
//                     {
//                         sender: 'bot',
//                         type: 'chart',
//                         chartData: processedData.data,
//                         dimensions: processedData.dimensions,
//                         measures: processedData.measures,
//                         currentDimension: processedData.currentDimension,
//                         viewType: processedData.viewType,
//                         sortDirection: processedData.sortDirection,
//                         queryResponse: response,
//                         rawData: processedData.rawData
//                     }
//                 ]);
//             } else if (processedData?.type === 'text') {
//                 setMessages(prevMessages => [
//                     ...prevMessages,
//                     {
//                         sender: 'bot',
//                         type: 'text',
//                         text: JSON.stringify(processedData.data, null, 2)
//                     }
//                 ]);
//             }
//         } catch (error) {
//             console.error('Error:', error);
//             setMessages(prevMessages => [
//                 ...prevMessages,
//                 { sender: 'bot', text: 'Error processing query. Please try again.' }
//             ]);
//         }
//     };

//     const getChartOptions = (measures) => {
//         const scales = {
//             x: {
//                 ticks: {
//                     maxRotation: 45,
//                     minRotation: 45
//                 }
//             }
//         };

//         // Create separate y-axes for each measure
//         measures.forEach((measure, index) => {
//             scales[`y${index}`] = {
//                 type: 'linear',
//                 display: true,
//                 position: index === 0 ? 'left' : 'right',
//                 beginAtZero: true,
//                 grid: {
//                     drawOnChartArea: index === 0,
//                 },
//                 title: {
//                     display: true,
//                     text: measure.label
//                 },
//                 ticks: {
//                     callback: function (value) {
//                         return value.toLocaleString();
//                     }
//                 }
//             };
//         });

//         return {
//             responsive: true,
//             maintainAspectRatio: false,
//             plugins: {
//                 legend: {
//                     position: 'top',
//                     align: 'start',
//                     labels: {
//                         usePointStyle: true,
//                         padding: 15,
//                         boxWidth: 10,
//                     }
//                 },
//                 title: {
//                     display: true,
//                     text: 'Data Visualization',
//                     padding: {
//                         top: 10,
//                         bottom: 20
//                     },
//                     font: {
//                         size: 16
//                     }
//                 }
//             },
//             scales
//         };
//     };

//     const DataTable = ({ data, dimensions, measures, pivotDimension }) => {
//         // If there's no pivot dimension, render the regular table
//         if (!pivotDimension) {
//             return (
//                 <div style={styles.tableContainer}>
//                     <table style={styles.table}>
//                         <thead>
//                             <tr>
//                                 {dimensions.map(dim => (
//                                     <th key={dim.name} style={styles.tableHeader}>{dim.label}</th>
//                                 ))}
//                                 {measures.map(measure => (
//                                     <th key={measure.name} style={styles.tableHeader}>{measure.label}</th>
//                                 ))}
//                             </tr>
//                         </thead>
//                         <tbody>
//                             {data.map((row, index) => (
//                                 <tr key={index}>
//                                     {dimensions.map(dim => (
//                                         <td key={dim.name} style={styles.tableCell}>{row[dim.name].value}</td>
//                                     ))}
//                                     {measures.map(measure => (
//                                         <td key={measure.name} style={styles.tableCell}>
//                                             {row[measure.name].value.toLocaleString()}
//                                         </td>
//                                     ))}
//                                 </tr>
//                             ))}
//                         </tbody>
//                     </table>
//                 </div>
//             );
//         }

//         // Create pivoted table structure
//         const primaryDimension = dimensions.find(d => d.name !== pivotDimension);
//         const primaryValues = [...new Set(data.map(row => row[primaryDimension.name].value))].sort();
//         const pivotValues = [...new Set(data.map(row => row[pivotDimension].value))].sort();

//         // Create a lookup for cell values and calculate min/max for heatmap
//         const cellLookup = {};
//         let minValue = Infinity;
//         let maxValue = -Infinity;

//         data.forEach(row => {
//             const primaryKey = row[primaryDimension.name].value;
//             const pivotKey = row[pivotDimension].value;

//             measures.forEach(measure => {
//                 const value = row[measure.name].value;
//                 cellLookup[`${primaryKey}-${pivotKey}-${measure.name}`] = value;
//                 minValue = Math.min(minValue, value);
//                 maxValue = Math.max(maxValue, value);
//             });
//         });

//         // Function to get cell background color for heatmap
//         const getCellBackground = (value) => {
//             const percentage = (value - minValue) / (maxValue - minValue);
//             return `rgba(0, 0, 255, ${percentage * 0.5})`; // Blue heatmap
//         };

//         return (
//             <div style={styles.tableContainer}>
//                 <table style={styles.table}>
//                     <thead>
//                         <tr>
//                             <th style={styles.tableHeader}>{primaryDimension.label}</th>
//                             {pivotValues.map(pivotValue => (
//                                 measures.map(measure => (
//                                     <th key={`${pivotValue}-${measure.name}`} style={styles.tableHeader}>
//                                         {`${pivotValue} - ${measure.label}`}
//                                     </th>
//                                 ))
//                             ))}
//                         </tr>
//                     </thead>
//                     <tbody>
//                         {primaryValues.map(primaryValue => (
//                             <tr key={primaryValue}>
//                                 <td style={styles.tableCell}>{primaryValue}</td>
//                                 {pivotValues.map(pivotValue => (
//                                     measures.map(measure => {
//                                         const value = cellLookup[`${primaryValue}-${pivotValue}-${measure.name}`] || 0;
//                                         return (
//                                             <td
//                                                 key={`${pivotValue}-${measure.name}`}
//                                                 style={{
//                                                     ...styles.tableCell,
//                                                     backgroundColor: getCellBackground(value)
//                                                 }}
//                                             >
//                                                 {value.toLocaleString()}
//                                             </td>
//                                         );
//                                     })
//                                 ))}
//                             </tr>
//                         ))}
//                     </tbody>
//                 </table>
//             </div>
//         );
//     };

//     const ChartControls = ({ message, onDimensionChange, onSortChange, onViewTypeChange }) => (
//         <div style={styles.chartControls}>
//             {message.dimensions && message.dimensions.length > 1 && (
//                 <>
//                     <div style={styles.controlGroup}>
//                         <label style={styles.controlLabel}>Primary Dimension:</label>
//                         <select
//                             value={message.currentDimension}
//                             onChange={(e) => onDimensionChange(message, e.target.value, message.pivotDimension)}
//                             style={styles.select}
//                         >
//                             {message.dimensions.map((dim) => (
//                                 <option key={dim.name} value={dim.name}>
//                                     {dim.label}
//                                 </option>
//                             ))}
//                         </select>
//                     </div>
//                     <div style={styles.controlGroup}>
//                         <label style={styles.controlLabel}>Pivot By:</label>
//                         <select
//                             value={message.pivotDimension || ''}
//                             onChange={(e) => onDimensionChange(message, message.currentDimension, e.target.value || null)}
//                             style={styles.select}
//                         >
//                             <option value="">No Pivot</option>
//                             {message.dimensions
//                                 .filter(dim => dim.name !== message.currentDimension)
//                                 .map((dim) => (
//                                     <option key={dim.name} value={dim.name}>
//                                         {dim.label}
//                                     </option>
//                                 ))
//                             }
//                         </select>
//                     </div>
//                 </>
//             )}
//             <div style={styles.controlGroup}>
//                 <label style={styles.controlLabel}>Sort By:</label>
//                 {message.pivotDimension ? (
//                     <select
//                         value="primary"
//                         disabled
//                         style={styles.select}
//                     >
//                         <option value="primary">Primary Dimension</option>
//                     </select>
//                 ) : (
//                     <select
//                         value={selectedSortMeasure || (message.measures[0]?.name || '')}
//                         onChange={(e) => setSelectedSortMeasure(e.target.value)}
//                         style={styles.select}
//                     >
//                         {message.measures.map((measure) => (
//                             <option key={measure.name} value={measure.name}>
//                                 {measure.label}
//                             </option>
//                         ))}
//                     </select>
//                 )}
//             </div>
//             <div style={styles.controlGroup}>
//                 <label style={styles.controlLabel}>Sort Order:</label>
//                 <select
//                     value={message.sortDirection}
//                     onChange={(e) => onSortChange(message, e.target.value)}
//                     style={styles.select}
//                 >
//                     <option value="asc">Ascending</option>
//                     <option value="desc">Descending</option>
//                 </select>
//             </div>
//             <div style={styles.controlGroup}>
//                 <label style={styles.controlLabel}>View Type:</label>
//                 <select
//                     value={message.viewType}
//                     onChange={(e) => onViewTypeChange(message, e.target.value)}
//                     style={styles.select}
//                 >
//                     <option value="table">Table</option>
//                     <option value="bar">Bar Chart</option>
//                     <option value="line">Line Chart</option>
//                 </select>
//             </div>
//         </div>
//     );

//     const MessageContent = ({ message }) => {
//         if (message.type === 'table' && message.dimensions) {
//             console.log('TABLE WITH ONLY DIMENSIONS')
//             return (
//                 <div style={styles.tableContainer}>
//                     <table style={styles.table}>
//                         <thead>
//                             <tr>
//                                 {message.dimensions.map(dim => (
//                                     <th key={dim.name} style={styles.tableHeader}>{dim.label}</th>
//                                 ))}
//                             </tr>
//                         </thead>
//                         <tbody>
//                             {message.data.map((row, index) => (
//                                 <tr key={index}>
//                                     {message.dimensions.map(dim => (
//                                         <td key={dim.name} style={styles.tableCell}>
//                                             {row[dim.name].value}
//                                         </td>
//                                     ))}
//                                 </tr>
//                             ))}
//                         </tbody>
//                     </table>
//                 </div>
//             );
//         }
//         if (message.type === 'chart') {
//             if (message.viewType === 'table') {
//                 return (
//                     <div style={styles.chartContainer}>
//                         <ChartControls
//                             message={message}
//                             onDimensionChange={handleDimensionChange}
//                             onSortChange={handleSortChange}
//                             onViewTypeChange={handleViewTypeChange}
//                         />
//                         <DataTable
//                             data={message.rawData}
//                             dimensions={message.dimensions}
//                             measures={message.measures}
//                             pivotDimension={message.pivotDimension}
//                         />
//                     </div>
//                 );
//             } else {
//                 const ChartComponent = message.viewType === 'line' ? Line : Bar;
//                 return (
//                     <div style={styles.chartContainer}>
//                         <ChartControls
//                             message={message}
//                             onDimensionChange={handleDimensionChange}
//                             onSortChange={handleSortChange}
//                             onViewTypeChange={handleViewTypeChange}
//                         />
//                         <div style={styles.messageChart}>
//                             <ChartComponent
//                                 data={message.chartData}
//                                 options={getChartOptions(message.measures)}
//                             />
//                         </div>
//                     </div>
//                 );
//             }
//         }
//         return (
//             <>
//                 <pre style={styles.preformatted}>{message.text}</pre>
//             </>
//         );
//     };

//     return (
//         <div style={styles.chatBotContainer}>
//             <div style={styles.selectionContainer}>
//                 <select
//                     value={selectedModel}
//                     onChange={(e) => setSelectedModel(e.target.value)}
//                     style={styles.dropdown}
//                 >
//                     <option value="">Select Model</option>
//                     {models.map((model) => (
//                         <option key={model.name} value={model.name}>
//                             {model.name}
//                         </option>
//                     ))}
//                 </select>
//                 <select
//                     value={selectedExplore}
//                     onChange={(e) => setSelectedExplore(e.target.value)}
//                     style={styles.dropdown}
//                     disabled={!selectedModel}
//                 >
//                     <option value="">Select Explore</option>
//                     {explores.map((explore) => (
//                         <option key={explore.name} value={explore.name}>
//                             {explore.name}
//                         </option>
//                     ))}
//                 </select>
//             </div>
//             <div style={styles.chatMessages}>
//                 {messages.map((msg, index) => (
//                     <div
//                         key={index}
//                         style={{
//                             ...styles.message,
//                             alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
//                             backgroundColor: msg.sender === 'user' ? '#d1f4ff' : '#f4f4f4',
//                             width: msg.type === 'chart' ? '90%' : 'auto',
//                             maxWidth: msg.type === 'chart' ? '90%' : '60%',
//                         }}
//                     >
//                         <MessageContent message={msg} />
//                     </div>
//                 ))}
//                 {isSummarizing && (
//                     <div style={{
//                         ...styles.message,
//                         alignSelf: 'flex-start',
//                         backgroundColor: '#f4f4f4',
//                         display: 'flex',
//                         alignItems: 'center',
//                         gap: '8px'
//                     }}>
//                         <Loader className="animate-spin" size={16} />
//                         <span>Generating summary...</span>
//                     </div>
//                 )}
//             </div>
//             <div style={styles.inputSection}>
//                 <textarea
//                     value={input}
//                     onChange={(e) => setInput(e.target.value)}
//                     onKeyDown={(e) => {
//                         if (e.key === 'Enter' && !e.shiftKey) {
//                             e.preventDefault();
//                             handleSendMessage();
//                         }
//                     }}
//                     style={styles.input}
//                     placeholder="Type your message..."

//                 />
//                 <button
//                     onClick={handleSendMessage}
//                     style={styles.button}
//                 >
//                     {'Send'}
//                 </button>
//             </div>
//         </div>
//     );
// };

// export default ChatBot;