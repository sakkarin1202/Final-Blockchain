import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import SimpleStorage_abi from './contracts/SimpleStorage_abi.json';
import Swal from 'sweetalert2';
import { FaWallet, FaCheckCircle, FaExclamationTriangle, FaHistory, FaTrash, FaEdit } from 'react-icons/fa';

const SimpleStore = () => {
  let contractAddress = '0x7129bEBB8D52d1DC0AB69fa4e70337445900F173';

  const [errorMessage, setErrorMessage] = useState(null);
  const [defaultAccount, setDefaultAccount] = useState(null);
  const [connButtonText, setConnButtonText] = useState('Connect Wallet');
  const [currentContractVal, setCurrentContractVal] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [history, setHistory] = useState([]);
  const [editIndex, setEditIndex] = useState(null); // Track the item being edited
  const [newInputValue, setNewInputValue] = useState(''); // Store the new value to edit

  const connectWalletHandler = () => {
    if (defaultAccount) {
      setDefaultAccount(null);
      setProvider(null);
      setSigner(null);
      setContract(null);
      setConnButtonText('Connect Wallet');
      Swal.fire({
        title: 'Disconnected',
        text: 'Wallet has been disconnected.',
        icon: 'info',
        confirmButtonText: 'OK'
      });
    } else if (window.ethereum && window.ethereum.isMetaMask) {
      window.ethereum.request({ method: 'eth_requestAccounts' })
        .then(result => {
          accountChangedHandler(result[0]);
          setConnButtonText('Disconnect Wallet');
        })
        .catch(error => {
          setErrorMessage(error.message);
        });
    } else {
      console.log('MetaMask is not installed');
      setErrorMessage('Please install MetaMask browser extension to interact');
    }
  };

  const accountChangedHandler = (newAccount) => {
    setDefaultAccount(newAccount);
    loadHistoryFromStorage(newAccount);
    updateEthers();
  };

  const chainChangedHandler = () => {
    window.location.reload();
  };

  window.ethereum.on('accountsChanged', accountChangedHandler);
  window.ethereum.on('chainChanged', chainChangedHandler);

  const updateEthers = () => {
    if (typeof window.ethereum === 'undefined') {
      console.error("MetaMask is not installed or not connected");
      setErrorMessage("MetaMask is not installed or not connected");
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(provider);

      const signer = provider.getSigner();
      setSigner(signer);

      const contractInstance = new ethers.Contract(contractAddress, SimpleStorage_abi, signer);
      setContract(contractInstance);
      console.log("Contract initialized:", contractInstance);
    } catch (error) {
      console.error("Error initializing contract:", error);
      setErrorMessage("Error initializing contract. Please try again.");
    }
  };

  const setHandler = async (event) => {
    event.preventDefault();
    const inputValue = event.target.setText.value;

    if (contract) {
      console.log('sending ' + inputValue + ' to the contract');
      try {
        const newHistoryEntry = { inputValue, status: "Pending" };
        setHistory(prevHistory => {
          const updatedHistory = [...prevHistory, newHistoryEntry];
          saveHistoryToStorage(defaultAccount, updatedHistory);
          return updatedHistory;
        });

        const tx = await contract.set(inputValue, { gasLimit: 1000000 });
        await tx.wait();

        setHistory(prevHistory => {
          const updatedHistory = prevHistory.map(entry =>
            entry === newHistoryEntry ? { ...entry, status: "Completed" } : entry
          );
          saveHistoryToStorage(defaultAccount, updatedHistory);
          return updatedHistory;
        });
      } catch (error) {
        setHistory(prevHistory => {
          const updatedHistory = prevHistory.map(entry =>
            entry === newHistoryEntry ? { ...entry, status: "Error" } : entry
          );
          saveHistoryToStorage(defaultAccount, updatedHistory);
          return updatedHistory;
        });
      }
    } else {
      console.error("Contract is not initialized");
      setErrorMessage("Contract is not initialized. Please connect your wallet.");
    }
  };

  const getCurrentVal = () => {
    const lastCompletedEntry = [...history].reverse().find(entry => entry.status === "Completed");
    if (lastCompletedEntry) {
      Swal.fire({
        title: 'Current Contract Value',
        text: `The latest value in the history is: ${lastCompletedEntry.inputValue}`,
        icon: 'info',
        confirmButtonText: 'OK'
      });
    } else {
      Swal.fire({
        title: 'No Value Found',
        text: 'There is no completed value in the history.',
        icon: 'info',
        confirmButtonText: 'OK'
      });
    }
  };

  const loadHistoryFromStorage = (account) => {
    const storedHistory = localStorage.getItem(account);
    if (storedHistory) {
      setHistory(JSON.parse(storedHistory));
    }
  };

  const saveHistoryToStorage = (account, history) => {
    localStorage.setItem(account, JSON.stringify(history));
  };

  const deleteHistory = (indexToDelete) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        const updatedHistory = history.filter((_, index) => index !== indexToDelete);
        setHistory(updatedHistory);
        saveHistoryToStorage(defaultAccount, updatedHistory);
        Swal.fire('Deleted!', 'The history item has been deleted.', 'success');
      }
    });
  };

  const startEditing = (index) => {
    setEditIndex(index);
    setNewInputValue(history[index].inputValue);
  };

  const handleEditChange = (e) => {
    setNewInputValue(e.target.value);
  };

  const saveEdit = () => {
    const updatedHistory = history.map((entry, index) =>
      index === editIndex ? { ...entry, inputValue: newInputValue } : entry
    );
    setHistory(updatedHistory);
    saveHistoryToStorage(defaultAccount, updatedHistory);
    setEditIndex(null);
    setNewInputValue('');
    Swal.fire('Updated!', 'The history item has been updated.', 'success');
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-50 p-6 pt-0">
      <div className="navbar bg-sky-50 w-full fixed top-0 flex justify-between p-4 shadow-md z-10">
        <h4 className="text-2xl font-semibold text-gray-700">Get/Set Contract Interaction</h4>
        <button 
          onClick={connectWalletHandler} 
          className="px-4 py-2 bg-blue-400 text-white rounded hover:bg-blue-500 transition-colors"
        >
          <FaWallet className="inline-block mr-2" />
          {connButtonText}
        </button>
      </div>

      <div className="w-full max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6 mt-24"> 
        <div className="mb-8">
          <h3 className="text-lg text-gray-600">Address: {defaultAccount}</h3>
        </div>

        <div className="flex flex-col items-center space-y-8 mb-8 p-6 bg-white shadow-md rounded-lg">
          <form onSubmit={setHandler} className="flex flex-col items-center space-y-6 w-full max-w-md">
            <input 
              id="setText" 
              type="text" 
              placeholder="Enter value" 
              className="px-4 py-3 border border-gray-300 rounded w-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button 
              type="submit" 
              className="px-4 py-2 bg-green-400 text-white rounded hover:bg-green-500 transition-colors"
            >
              <FaCheckCircle className="inline-block mr-2" />
              Update Contract
            </button>
          </form>

          <button 
            onClick={getCurrentVal} 
            className="px-4 py-2 bg-indigo-400 text-white rounded hover:bg-indigo-500 transition-colors"
          >
            <FaHistory className="inline-block mr-2" />
            Get Current Contract Value
          </button>
        </div>

        <div className="flex flex-col w-full mt-6">
          <h4 className="text-lg font-semibold text-gray-700 mb-4">History</h4>
          <table className="w-full bg-gray-50 rounded-lg shadow overflow-hidden">
            <thead>
              <tr>
                <th className="border-b px-4 py-2 text-gray-600 font-semibold text-left">Input Value</th>
                <th className="border-b px-4 py-2 text-gray-600 font-semibold text-left">Status</th>
                <th className="border-b px-4 py-2 text-gray-600 font-semibold text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry, index) => (
                <tr key={index}>
                  <td className="border-b px-4 py-2">
                    {editIndex === index ? (
                      <input
                        type="text"
                        value={newInputValue}
                        onChange={handleEditChange}
                        className="px-2 py-1 border rounded w-full"
                      />
                    ) : (
                      entry.inputValue
                    )}
                  </td>
                  <td className="border-b px-4 py-2">{entry.status}</td>
                  <td className="border-b px-4 py-2 flex space-x-2">
                    {editIndex === index ? (
                      <button
                        onClick={saveEdit}
                        className="px-2 py-1 bg-green-400 text-white rounded hover:bg-green-500 transition-colors"
                      >
                        Save
                      </button>
                    ) : (
                      <button
                        onClick={() => startEditing(index)}
                        className="px-2 py-1 bg-blue-400 text-white rounded hover:bg-blue-500 transition-colors"
                      >
                        <FaEdit />
                      </button>
                    )}
                    <button
                      onClick={() => deleteHistory(index)}
                      className="px-2 py-1 bg-red-400 text-white rounded hover:bg-red-500 transition-colors"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SimpleStore;
