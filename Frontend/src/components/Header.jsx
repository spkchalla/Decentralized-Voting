import React from 'react'

const Header = () => {
  return (
    <div className='flex flex-col items-center mt-30 px-4 text-center text-gray-800'>
        <h1 className='flex items-center gap-2 text-xl sm:text-3xl font-medium mb-2'>Hello Voter</h1>
        <h2 className='text-3xl sm:text-4xl font-semibold mb-4'>Welcome to the Decentralized Voting System</h2>
        <p className='mb-8 max-w-md'>Cast your vote securely, anonymously, and transparently.</p>
        <button className='border border-gray-500 rounded-full px-8 py-2.5 hover:bg-gray-100 transition-all'>Get Started</button>
    </div>
  )
}

export default Header