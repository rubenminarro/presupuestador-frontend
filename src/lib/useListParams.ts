import { useEffect, useState } from 'react'

/** Estado de un listado paginado con búsqueda: la búsqueda espera a que se deje de escribir y vuelve a la página 1. */
export function useListParams(perPage = 10, delayMs = 350) {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, delayMs)
    return () => clearTimeout(timer)
  }, [searchInput, delayMs])

  return {
    page,
    setPage,
    searchInput,
    setSearchInput,
    params: { page, per_page: perPage, search },
  }
}
