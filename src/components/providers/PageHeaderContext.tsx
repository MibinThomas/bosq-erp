"use client"

import React, { createContext, useContext, useState, useCallback } from "react"

interface PageHeaderContextType {
  headerContent: React.ReactNode | null
  setHeaderContent: (content: React.ReactNode | null) => void
}

const PageHeaderContext = createContext<PageHeaderContextType>({
  headerContent: null,
  setHeaderContent: () => {},
})

export function PageHeaderProvider({ children }: { children: React.ReactNode }) {
  const [headerContent, setHeaderContent] = useState<React.ReactNode | null>(null)

  const updateHeaderContent = useCallback((content: React.ReactNode | null) => {
    setHeaderContent(content)
  }, [])

  return (
    <PageHeaderContext.Provider value={{ headerContent, setHeaderContent: updateHeaderContent }}>
      {children}
    </PageHeaderContext.Provider>
  )
}

export function usePageHeader() {
  return useContext(PageHeaderContext)
}
