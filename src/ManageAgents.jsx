import React, { useState, useEffect, useContext } from 'react';
import { ExtensionContext } from '@looker/extension-sdk-react';
import { styles } from './styles';
import Examples from './Examples';
import Fields from './Fields';
import ExtraContext from './ExtraContext';

const ManageAgents = () => {
    const [selectedModel, setSelectedModel] = useState('');
    const [selectedExplore, setSelectedExplore] = useState('');
    const [selectedAgent, setSelectedAgent] = useState('');
    const [newAgentName, setNewAgentName] = useState('');
    const [isAddingNewAgent, setIsAddingNewAgent] = useState(false);
    const [models, setModels] = useState([]);
    const [explores, setExplores] = useState([]);
    const [agents, setAgents] = useState([]);
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

    const handleToggleAddAgent = () => {
        setIsAddingNewAgent(!isAddingNewAgent);
        // Reset selections when toggling
        setSelectedAgent('');
        setNewAgentName('');
        setSelectedModel('');
        setSelectedExplore('');
    };

    const getActiveAgentName = () => {
        if (isAddingNewAgent) {
            return newAgentName;
        }
        return selectedAgent;
    };

    return (
        <div style={styles.container}>
            <div style={styles.selectionContainer}>
                <div className="flex items-center gap-4 mb-4">
                    <button
                        onClick={handleToggleAddAgent}
                    >
                        {isAddingNewAgent ? 'Select Existing Agent' : 'Add New Agent'}
                    </button>
                </div>

                {isAddingNewAgent ? (
                    <input
                        type="text"
                        value={newAgentName}
                        onChange={(e) => setNewAgentName(e.target.value)}
                        placeholder="Enter new agent name"
                    />
                ) : (
                    <select
                        value={selectedAgent}
                        onChange={(e) => setSelectedAgent(e.target.value)}
                    >
                        <option value="">Select Agent</option>
                        {agents.map((agent, index) => (
                            <option key={index} value={agent["agents.agent_name"]}>
                                {agent["agents.agent_name"]}
                            </option>
                        ))}
                    </select>
                )}

                <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    disabled={isAddingNewAgent ? !newAgentName : !selectedAgent}
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

            {((isAddingNewAgent && newAgentName) || (!isAddingNewAgent && selectedAgent)) && (
                <div className="mt-8">
                    <p className="mb-4">Next we need to upload examples to BigQuery for the few shot prompt.</p>
                    <Examples agent={getActiveAgentName()} model={selectedModel} explore={selectedExplore} />
                    <p className="mt-6 mb-4">Here we can select which fields chatter will have access to.</p>
                    <Fields />
                    <p className="mt-6 mb-4">Finally we need to add any additional context.</p>
                    <ExtraContext />
                </div>
            )}
        </div>
    );
};

export default ManageAgents;