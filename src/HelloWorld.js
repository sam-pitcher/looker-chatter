import React, { useEffect, useState, useContext } from 'react'
import { Space, ComponentsProvider, Span, Tabs2, Tab2 } from '@looker/components'
import { ExtensionContext } from '@looker/extension-sdk-react'
import { DataProvider } from '@looker/components-data'
import { Query, Visualization } from '@looker/visualizations'
import ChatBot from './ChatBot';
import Examples from './Examples';
import Fields from './Fields';

export const HelloWorld = () => {
  const { core40SDK } = useContext(ExtensionContext)
  const [message, setMessage] = useState()
  const [htmlContent, setHtmlContent] = useState();

  // useEffect(() => {
  //   const initialize = async () => {
  //     try {
  //       const value = await core40SDK.ok(core40SDK.me())
  //       setMessage(`Hello, ${value.display_name}`)
  //       console.log('wassup');
  //     } catch (error) {
  //       setMessage('Error occured getting information about me!')
  //       console.error(error)
  //     }
  //   }
  //   initialize()
  // }, [])

  return (
    <>
      <ComponentsProvider>
        <DataProvider sdk={core40SDK}>
        <h1>Chatter</h1>
        <Tabs2>
          <Tab2 id="10" label="Chatter">
            <div>
            <h1>Talk to your data.</h1>
              <ChatBot />
            </div>
          </Tab2>
          <Tab2 id="11" label="Examples">
            <div>
            <h1>Examples set up.</h1>
              <Examples />
            </div>
          </Tab2>
          <Tab2 id="12" label="Fields">
            <div>
            <h1>Fields set up.</h1>
              <Fields />
            </div>
          </Tab2>
        </Tabs2>
        <Space around>
          <Span fontSize="xxxxxlarge">
            {message}
          </Span>
            {/* the value referenced by the `query` prop is
              unique to your looker instance. */}
              <Query dashboard={"bigquery-velo::materialized_views"}>
                <Visualization />
              </Query>
        </Space>
        </DataProvider>
      </ComponentsProvider>
    </>
  )
}