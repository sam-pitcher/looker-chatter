import React, { useEffect, useState, useContext } from 'react'
import { Space, ComponentsProvider, Span, Tabs2, Tab2 } from '@looker/components'
import { ExtensionContext } from '@looker/extension-sdk-react'
import { DataProvider } from '@looker/components-data'
import ChatBot from './ChatBot';
import ManageAgents from './ManageAgents';
import AgentList from './AgentList';
import Examples from './Examples';
import Fields from './Fields';
import ExtraContext from './ExtraContext';

export const HelloWorld = () => {
  const { core40SDK } = useContext(ExtensionContext)

  return (
    <>
    <div style={{ fontFamily: 'Roboto' }}>
      <ComponentsProvider>
        <DataProvider sdk={core40SDK}>
          <p>Talk to your data with chatter.</p>
            <ChatBot />
        {/* <p>Chatter</p> */}
        {/* <Tabs2> */}
          {/* <Tab2 id="10" label="Chatter">
              <ChatBot />
          </Tab2> */}
          {/* <Tab2 id="14" label="Manage Agents">
            <h1>Manage Agents.</h1>
              <ManageAgents />
          </Tab2> */}
          {/* <Tab2 id="15" label="Manage Agents">
            <h1>Manage Agents</h1>
              <AgentList />
          </Tab2> */}
          {/* <Tab2 id="11" label="Examples">
            <h1>Examples set up.</h1>
              <Examples />
          </Tab2>
          <Tab2 id="12" label="Fields">
            <h1>Fields set up.</h1>
              <Fields />
          </Tab2>
          <Tab2 id="13" label="Extra Context">
            <h1>Extra Context set up.</h1>
              <ExtraContext />
          </Tab2> */}
        {/* </Tabs2> */}
        </DataProvider>
      </ComponentsProvider>
      </div>
    </>
  )
}