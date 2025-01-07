import React from "react"

interface LoadingProps {
  className?: string
}

const Loading: React.FC<LoadingProps> = ({ className }) => {
  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
    </div>
  )
}

export default Loading 