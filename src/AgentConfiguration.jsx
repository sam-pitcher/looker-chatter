import React, { useState, useEffect, useContext } from 'react';
import { ExtensionContext } from '@looker/extension-sdk-react';
import Examples from './Examples';
import Fields from './Fields';
import ExtraContext from './ExtraContext';

const AgentConfiguration = ({ agent: initialAgentName, onBack }) => {
    const [agentName, setAgentName] = useState(initialAgentName);
    const [models, setModels] = useState([]);
    const [explores, setExplores] = useState([]);
    const [selectedModel, setSelectedModel] = useState('');
    const [selectedExplore, setSelectedExplore] = useState('');
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

    return (
        <div>
            <h2>{initialAgentName ? 'Edit Agent' : 'Create Agent'}</h2>
            <button onClick={onBack}>Back to List</button>
            <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Agent Name"
            />
            <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
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
            <Examples agent={agentName} model={selectedModel} explore={selectedExplore} />
            <Fields />
            <ExtraContext />
        </div>
    );
};

export default AgentConfiguration;