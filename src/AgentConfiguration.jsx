import React, { useState, useEffect, useContext } from 'react';
import { ExtensionContext } from '@looker/extension-sdk-react';
import ExampleComponent from './ExampleComponent';
import Fields from './Fields';
import ExtraContext from './ExtraContext';
import { styles } from './styles'; // Import your styles

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
            <h3>{initialAgentName ? 'Edit Agent' : 'Create Agent'}</h3>
            <button onClick={onBack} style={{
                ...styles.button,
                margin: '5px 5px 5px 5px',
                whiteSpace: 'nowrap',
            }}>Back to List</button>
            <input
                type="text"
                style={styles.input}
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Agent Name"
            />
            <ExampleComponent agent={agentName} />
            {/* <Fields /> */}
            {/* <ExtraContext /> */}
        </div>
    );
};

export default AgentConfiguration;