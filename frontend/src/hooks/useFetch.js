import { useEffect, useState } from 'react'
import api from '../utils/api.js'

export default function useFetch(url, options = {}, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    api
      .get(url, options)
      .then((res) => {
        if (mounted) setData(res.data)
      })
      .catch((e) => mounted && setError(e))
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, setData }
}






