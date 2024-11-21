import React, { useState, useEffect, useMemo } from 'react';


const ODRequestApproval = () => {
  const [requests, setRequests] = useState([]);
  const [uniqueReasons, setUniqueReasons] = useState(['All']);
  const [uniqueYears, setUniqueYears] = useState(['All']);
  const [uniqueSections, setUniqueSections] = useState(['All']);
  const [selectedReason, setSelectedReason] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedSection, setSelectedSection] = useState('All');
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [showBatchTimingForm, setShowBatchTimingForm] = useState(false);
  const [batchTimings, setBatchTimings] = useState({
    from_time: '',
    to_time: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 15;

  // Utility function to format time
  const formatTime = (time) => {
    return new Date(time).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Function to handle reason selection
  const handleReasonSelect = (reason) => {
    setSelectedReason(reason);
    setCurrentPage(1);
  };

  // Function to handle year selection
  const handleYearSelect = (year) => {
    setSelectedYear(year);
    setCurrentPage(1);
  };

  // Function to handle section selection
  const handleSectionSelect = (section) => {
    setSelectedSection(section);
    setCurrentPage(1);
  };

  // Function to toggle request selection
  const toggleSelection = (odId) => { 
    setSelectedRequests(prev => 
      prev.includes(odId) 
        ? prev.filter(id => id !== odId) 
        : [...prev, odId]
    );
  };

  // Select all/deselect all functionality
  const toggleSelectAll = () => {
    const filteredRequests = getFilteredRequests();
    setSelectedRequests(
      selectedRequests.length === filteredRequests.length
        ? []
        : filteredRequests.map(r => r.od_id)
    );
  };

  // Bulk action handler (approve, reject, modify)
  const handleBulkAction = async (action) => {
    setLoading(true);
    try {
      const response = await fetch('/api/od-request/bulk-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestIds: selectedRequests,
          action: action,
          ...(action === 'modify' && { 
            from_time: batchTimings.from_time, 
            to_time: batchTimings.to_time 
          })
        })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process requests');
      }
  
      // Refresh the requests or update the UI as needed
      const updatedRequests = await fetch('/api/od-request?status=0');
      const data = await updatedRequests.json();
      setRequests(data);
  
      // Reset selections
      setSelectedRequests([]);
      setShowBatchTimingForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch requests on component mount
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await fetch('/api/od-request?status=0');  // Fetch pending requests
        const data = await response.json();
        setRequests(data);
        
        // Extract unique reasons, years, and sections dynamically
        const reasons = ['All', ...new Set(data.map(request => request.reason).filter(Boolean))];
        const years = ['All', ...new Set(data.map(request => request.year).filter(Boolean))];
        const sections = ['All', ...new Set(data.map(request => request.sec).filter(Boolean))];
        
        setUniqueReasons(reasons);
        setUniqueYears(years);
        setUniqueSections(sections);
      } catch (error) {
        console.error('Failed to fetch requests', error);
      }
    };
  
    fetchRequests();
  }, []);

  // Filtering and Searching logic
  const getFilteredRequests = useMemo(() => {
    return () => {
      let filteredRequests = requests;

      // Filter by reason
      if (selectedReason !== 'All') {
        filteredRequests = filteredRequests.filter(r => r.reason === selectedReason);
      }

     // Filter by year
if (selectedYear !== 'All') {
  filteredRequests = filteredRequests.filter(r => 
    String(r.year).trim() === String(selectedYear).trim()
  );
}

// Filter by section
if (selectedSection !== 'All') {
  filteredRequests = filteredRequests.filter(r => r.sec === selectedSection);
}

      // Search by name
      if (searchQuery) {
        const lowercaseQuery = searchQuery.toLowerCase();
        filteredRequests = filteredRequests.filter(r => 
          r.name.toLowerCase().includes(lowercaseQuery)
        );
      }

      return filteredRequests;
    };
  }, [requests, selectedReason, selectedYear, selectedSection, searchQuery]);

  // Pagination logic
  const paginatedRequests = useMemo(() => {
    const filteredRequests = getFilteredRequests();
    const startIndex = (currentPage - 1) * recordsPerPage;
    return filteredRequests.slice(startIndex, startIndex + recordsPerPage);
  }, [getFilteredRequests, currentPage, recordsPerPage]);

  // Pagination controls
  const totalPages = Math.ceil(getFilteredRequests().length / recordsPerPage);

  return (
    <div className="p-6 max-w-5xl mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 text-gray-700">
        Approve or Reject On Duty Requests
      </h1>
      
      {error && (
        <div className="text-red-500 mb-4 p-2 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      {/* Search and Filter Section */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-grow">
          <input 
            type="text" 
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-300"
          />
        </div>
      </div>

      {/* Reason Filters */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {uniqueReasons.map((reason) => (
          <button
            key={reason}
            onClick={() => handleReasonSelect(reason)}
            className={`p-4 rounded-lg shadow-md text-center transition-all ${
              selectedReason === reason
                ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                : 'bg-white hover:bg-blue-50'
            }`}
          >
            <div className="font-medium">{reason}</div>
            <div className="text-sm mt-1">
              ({reason === "All" 
                ? requests.length 
                : requests.filter(r => r.reason === reason).length} students)
            </div>
          </button>
        ))}
      </div>

      {/* Year and Section Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
        <select 
  value={selectedYear}
  onChange={(e) => handleYearSelect(e.target.value)}
  className="w-full px-4 py-2 border rounded-md"
>
  {uniqueYears.map(year => (
    <option key={year} value={year}>{year}</option>
  ))}
</select>
        </div>
        <div className="flex-1">
        <select 
  value={selectedSection}
  onChange={(e) => handleSectionSelect(e.target.value)}
  className="w-full px-4 py-2 border rounded-md"
>
  {uniqueSections.map(section => (
    <option key={section} value={section}>{section}</option>
  ))}
</select>
        </div>
      </div>

      {selectedReason && (
        <div className="mb-4 max-h-[50vh] overflow-y-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead className="sticky top-0 bg-gray-200">
              <tr>
                <th className="px-4 py-2 border">
                  <input
                    type="checkbox"
                    checked={selectedRequests.length === getFilteredRequests().length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                  />
                </th>
                <th className="px-4 py-2 border">Name</th>
                <th className="px-4 py-2 border">Section</th>
                <th className="px-4 py-2 border">Year</th>
                {selectedReason === "All" && (
                  <th className="px-4 py-2 border">Reason</th>
                )}
                <th className="px-4 py-2 border">From Time</th>
                <th className="px-4 py-2 border">To Time</th>
                <th className="px-4 py-2 border">Description</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRequests.map((request) => (
                <tr 
                  key={request.od_id}
                  className={selectedRequests.includes(request.od_id) ? "bg-blue-50" : ""}
                >
                  <td className="px-4 py-2 border text-center">
                    <input
                      type="checkbox"
                      checked={selectedRequests.includes(request.od_id)}
                      onChange={() => toggleSelection(request.od_id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-2 border">{request.name}</td>
                  <td className="px-4 py-2 border">{request.sec}</td>
                  <td className="px-4 py-2 border">{request.year}</td>
                  {selectedReason === "All" && (
                    <td className="px-4 py-2 border">{request.reason}</td>
                  )}
                  <td className="px-4 py-2 border">{formatTime(request.from_time)}</td>
                  <td className="px-4 py-2 border">{formatTime(request.to_time)}</td>
                  <td className="px-4 py-2 border">{request.description}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          <div className="flex justify-between items-center mt-4">
            <div>
              Showing {(currentPage - 1) * recordsPerPage + 1} - {Math.min(currentPage * recordsPerPage, getFilteredRequests().length)} of {getFilteredRequests().length} results
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedRequests.length > 0 && (
        <div className="flex justify-between items-center">
          <button
            onClick={() => setShowBatchTimingForm(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700 transition duration-200"
          >
            Modify Timings
          </button>
          <button
            onClick={() => handleBulkAction('approve')}
            disabled={loading}
            className={`bg-green-500 text-white px-4 py-2 rounded hover:bg-green-700 transition duration-200 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? "Approving..." : "Approve"}
          </button>
          <button
            onClick={() => handleBulkAction('reject')}
            disabled={loading}
            className={`bg-red-500 text-white px-4 py-2 rounded hover:bg-red-700 transition duration-200 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? "Rejecting..." : "Reject"}
          </button>
        </div>
      )}

      {showBatchTimingForm && (
        <div className="mt-4 p-4 border rounded-md bg-gray-50">
          <h2 className="text-lg font-bold mb-4">Modify Batch Timings</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleBulkAction('modify');
            }}
            className="space-y-4"
          >
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Time</label>
                <input
                  type="time"
                  value={batchTimings.from_time}
                  onChange={(e) => setBatchTimings(prev => ({...prev, from_time: e.target.value}))}
                  className="border px-4 py-2 rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Time</label>
                <input
                  type="time"
                  value={batchTimings.to_time}
                  onChange={(e) => setBatchTimings(prev => ({...prev, to_time: e.target.value}))}
                  className="border px-4 py-2 rounded"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowBatchTimingForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ODRequestApproval;