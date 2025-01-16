import React, { useEffect, useState, useContext } from 'react'
import { Space, ComponentsProvider, Span, Tabs2, Tab2 } from '@looker/components'
import { ExtensionContext } from '@looker/extension-sdk-react'
import { DataProvider } from '@looker/components-data'
import { Query, Visualization } from '@looker/visualizations'
import ChatBot from './ChatBot';
import Examples from './Examples';

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
          {/* <Tab2 id="1" label="Jobs Overview">
            <iframe
              // {window.location.href}
              src = 'https://452227bf-6f71-4262-bb19-e913e4ee41db.looker.app/embed/dashboards/bigquery-velo::slots_overview'
              width="100%"
              height="100%"
              title="Jobs Overview"
              style={{ border: 'none' }}
            />
          </Tab2>
          <Tab2 id="2" label="Materialized Views Stats">
            <iframe
              src = 'https://452227bf-6f71-4262-bb19-e913e4ee41db.looker.app/embed/dashboards/bigquery-velo::materialized_views'
              width="100%"
              height="100%"
              title="Materialized Views"
              style={{ border: 'none' }}
            />
          </Tab2>
          <Tab2 id="3" label="BI Engine Stats">
            <iframe
              src = 'https://452227bf-6f71-4262-bb19-e913e4ee41db.looker.app/embed/dashboards/bigquery-velo::bi_engine'
              width="100%"
              height="100%"
              title="BI Engine Stats"
              style={{ border: 'none' }}
            />
          </Tab2>
          <Tab2 id="7" label="Gemini Suggestions">
            <iframe
              src = 'https://452227bf-6f71-4262-bb19-e913e4ee41db.looker.app/embed/dashboards/bigquery-velo::gemini_suggestions'
              width="100%"
              height="100%"
              title="Gemini Suggestions"
              style={{ border: 'none' }}
            />
          </Tab2> */}
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