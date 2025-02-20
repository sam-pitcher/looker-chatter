import React, { useState, useEffect, useContext } from 'react';
import { ExtensionContext } from '@looker/extension-sdk-react';
import AgentConfiguration from './AgentConfiguration';
import { styles } from './styles'; // Import your styles

const AgentList = () => {
    const [agents, setAgents] = useState([]);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [isCreatingNewAgent, setIsCreatingNewAgent] = useState(false);
    const { core40SDK } = useContext(ExtensionContext);

    useEffect(() => {
        const fetchAgents = async () => {
            try {
                const response = await core40SDK.ok(core40SDK.run_inline_query({
                    body: {
                        model: 'chatter',
                        view: 'agents',
                        fields: ['agents.agent_name']
                    },
                    result_format: 'json',
                }));
                setAgents(response);
            } catch (error) {
                console.error('Error fetching agents:', error);
            }
        };
        fetchAgents();
    }, []);

    const handleCreateNewAgent = () => {
        setIsCreatingNewAgent(true);
        setSelectedAgent({ "agents.agent_name": "" });
    };

    const handleAgentSelect = (agent) => {
        setSelectedAgent(agent);
        setIsCreatingNewAgent(false);
    };

    const handleBackToList = () => {
        setSelectedAgent(null);
        setIsCreatingNewAgent(false);
        fetchAgents();
    };

    return (
        <div> 
            <button onClick={handleCreateNewAgent} style={{ 
              ...styles.button, 
                backgroundColor: '#34A853', 
                color: 'white',
                marginBottom: '10px',
                marginLeft: 'auto'
            }}>
                + Create agent
            </button>

            <div style={styles.chatBotContainer}> {/* chatBotContainer is now applied only to the agent list */}
                {selectedAgent? (
                    <AgentConfiguration agent={selectedAgent["agents.agent_name"]} onBack={handleBackToList} />
                ): (
                    <div>
                        <p>Agent List</p>

                        <div style={styles.chatMessages}>
                            {agents.map((agent, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleAgentSelect(agent)}
                                    style={{
                                      ...styles.button,
                                        margin: '5px 0',
                                        width: 'calc(50% - 10px)',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {agent["agents.agent_name"]}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AgentList;