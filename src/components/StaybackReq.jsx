import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Search, X, Plus, ChevronDown } from 'lucide-react';
import StaybackLog from './StaybackLog';



const StaybackRequest = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  
const teamOptions = [
  'Event Coordinator',
  'Committee Coordinator',
  'Content',
  'Development',
  'Design',
  'Documentation',
  'Helpdesk and Registration',
  'Hosting',
  'Logistics & Requirements',
  'Marketing',
  'Non-technical Events',
  'Social Media',
  'Technical',
  'Workshops',
  'Sponsorship',
  'Media',
  'Decoration'
];

  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    team: '',
    title: '',
    date: '',
    students: []
  });

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [staybacks, setStaybacks] = useState({});  // Grouped by date
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [localSearch, setLocalSearch] = useState('');

  const fetchStaybacks = async () => {
    try {
      const response = await fetch('/api/staybacks');
      const data = await response.json();
      
      // If data is already grouped by date (from API)
      if (typeof data === 'object' && !Array.isArray(data)) {
        setStaybacks(data);
        return;
      }
      
      // If data is an array (fallback case)
      if (Array.isArray(data)) {
        const groupedStaybacks = data.reduce((acc, stayback) => {
          if (!stayback?.dateGroup?.date) {
            console.warn('Stayback missing required date property:', stayback);
            return acc;
          }
  
          const date = new Date(stayback.dateGroup.date).toISOString().split('T')[0];
          if (!acc[date]) {
            acc[date] = [];
          }
          acc[date].push({
            ...stayback,
            date: new Date(stayback.dateGroup.date)
          });
          return acc;
        }, {});
        
        setStaybacks(groupedStaybacks);
      } else {
        console.error('Unexpected data format received:', typeof data);
        setStaybacks({});
      }
    } catch (error) {
      console.error('Failed to fetch staybacks:', error);
      setError('Failed to fetch staybacks. Please try again later.');
      setStaybacks({});
    }
  };
  
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        if (selectedSection !== 'all') params.append('section', selectedSection);
        if (selectedYear !== 'all') params.append('year', selectedYear);
  
        const response = await fetch(`/api/students?${params.toString()}`);
        const data = await response.json();
        setStudents(data);
      } catch (err) {
        setError('Failed to fetch students');
      }
    };
  
    if (status === 'authenticated') {
      fetchStudents();
      fetchStaybacks();
    }
  }, [status, searchTerm, selectedSection, selectedYear]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStudentSelect = (email) => {
    setFormData(prev => ({
      ...prev,
      students: prev.students.includes(email)
        ? prev.students.filter(e => e !== email)
        : [...prev.students, email]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/staybacks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          date: new Date(formData.date)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit stayback request');
      }

      setFormData({
        team: '',
        title: '',
        date: '',
        students: []
      });

      await fetchStaybacks();
      alert('Stayback request submitted successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin');
    }
  }, [status, router]);

  // Filter students based on local search
  const filteredStudents = students.filter(student => {
    const searchLower = localSearch.toLowerCase();
    return (
      student.name.toLowerCase().includes(searchLower) ||
      student.email.toLowerCase().includes(searchLower) ||
      student.sec.toLowerCase().includes(searchLower) ||
      student.year.toString().includes(searchLower)
    );
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Reset form and error state when closing
    setFormData({
      team: '',
      title: '',
      date: '',
      students: []
    });
    setError(null);
    setLocalSearch('');
  };


  return (
    <div className="p-4 sm:p-6 w-full max-w-4xl mx-auto bg-black rounded-xl shadow-md">
      {/* Create Stayback Button */}
      <div className="flex items-center justify-between">
  {/* Company Logo */}
  <img 
    className="w-[150px] h-[150px] rounded object-contain" 
    src="/logo1.png" 
    alt="Company Logo" 
  />
  
  {/* Create Stayback Button */}
  <button 
    onClick={() => setIsModalOpen(true)}
    className="bg-[#00f5d0] w-[170px] h-[50px] hover:opacity-90 text-black font-semibold py-1.5 px-3 rounded flex items-center text-m"
  >
    <Plus className="mr-2" size={16} />
    Create Stayback
  </button>
</div>

  
      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-40 flex justify-center items-center">
          <div className="bg-black border border-[#00f5d0] rounded-xl shadow-md w-full max-w-4xl max-h-[90vh] overflow-y-auto relative p-6">
            {/* Close Button */}
            <button 
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-[#00f5d0] hover:opacity-90"
            >
              <X size={24} />
            </button>
  
            <div className='flex flex-row'>
              
              <h1 className="text-2xl sm:text-2xl py-12 px-36 font-bold mb-4 ml-10 sm:mb-6 text-gray-400">
                Create Stayback
              </h1>
            </div>
  
            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-md mb-4">
                {error}
              </div>
            )}
  
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-[#00f5d0]">Team</label>
                <div className="relative">
                  <select
                    name="team"
                    value={formData.team}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-white rounded-md bg-black text-white focus:ring-2 focus:ring-[#00f5d0] appearance-none"
                  >
                    <option value="">Select a team</option>
                    {teamOptions.map((team) => (
                      <option key={team} value={team} className="bg-black text-white">
                        {team}
                      </option>
                    ))}
                  </select>
                  <ChevronDown 
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#00f5d0] pointer-events-none" 
                    size={20} 
                  />
                </div>
              </div>
  
              <div>
                <label className="block mb-2 text-sm font-medium text-[#00f5d0]">Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-white rounded-md bg-black text-white focus:ring-2 focus:ring-[#00f5d0]"
                />
              </div>
  
              <div>
                <label className="block mb-2 text-sm font-medium text-[#00f5d0]">Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-[#00f5d0] rounded-md bg-white text-black focus:ring-2 focus:ring-[#00f5d0]"
                />
              </div>
  
              <div>
                <label className="block mb-2 text-sm font-medium text-[#00f5d0]">Select Students</label>
                
                <div className="mb-4 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#00f5d0]" size={20} />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-white rounded-md bg-black text-white focus:ring-2 focus:ring-[#00f5d0]"
                  />
                </div>
  
                <div className="max-h-96 overflow-y-auto border border-white rounded-md">
                  <table className="min-w-full divide-y divide-[#00f5d0]">
                    <thead className="bg-black sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#00f5d0] uppercase tracking-wider">
                          Select
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#00f5d0] uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#00f5d0] uppercase tracking-wider">
                          Section
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#00f5d0] uppercase tracking-wider">
                          Year
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-black divide-y divide-[#00f5d0]">
                      {filteredStudents.map((student) => (
                        <tr 
                          key={student.email}
                          className={`hover:bg-[#00f5d010] cursor-pointer ${
                            formData.students.includes(student.email) ? 'bg-[#00f5d020]' : ''
                          }`}
                          onClick={() => handleStudentSelect(student.email)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={formData.students.includes(student.email)}
                              onChange={() => handleStudentSelect(student.email)}
                              className="h-4 w-4 text-[#00f5d0] focus:ring-[#00f5d0] border-[#00f5d0] rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-white">{student.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {student.sec}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {student.year}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
  
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-2 sm:py-3 rounded-md text-black font-bold transition duration-200 ${
                    loading 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-[#00f5d0] hover:opacity-90'
                  }`}
                >
                  {loading ? 'Submitting...' : 'Create Stayback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
  
      <div className="mt-6">
        <StaybackLog 
          staybacks={staybacks} 
          setStaybacks={setStaybacks} 
          fetchStaybacks={fetchStaybacks} 
        />
      </div>
    </div>
  );
};
  
  export default StaybackRequest;