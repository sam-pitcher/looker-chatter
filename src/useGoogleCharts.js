import { useEffect, useState } from "react";

function useGoogleCharts () {
  const [google, setGoogle] = useState(null);
    
    useEffect(() => {
        if (!google) {
            //TODO load google charts
        }
   }, [google]);

  return google;
}

export default useGoogleCharts;