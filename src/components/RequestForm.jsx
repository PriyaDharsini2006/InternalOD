import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const RequestForm = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { data: session, status } = useSession();
  const [timeError, setTimeError] = useState('');
  const router = useRouter();
  
  const ITEMS_PER_PAGE = 10;
  const sectionsOptions = ['A', 'B', 'C', 'D'];
  const yearsOptions = [2027, 2026, 2025, 2024];
  const [loading, setLoading] = useState(true);


  const convertTo12Hour = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };
  const convertTo24Hour = (time12) => {
    if (!time12) return '';
    const [time, modifier] = time12.split(' ');
    let [hours, minutes] = time.split(':');
    hours = parseInt(hours);
    
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  };
  const validateTime = (startTime, endTime) => {
    if (!startTime || !endTime) return null;
    
    const workingHoursStart = 8; // 8 AM
    const workingHoursEnd = 17; // 5 PM
    
    const [startHour] = startTime.split(':').map(Number);
    const [endHour] = endTime.split(':').map(Number);
    
    if (startHour < workingHoursStart || startHour > workingHoursEnd ||
        endHour < workingHoursStart || endHour > workingHoursEnd) {
      return 'Please select times between 8:00 AM and 5:00 PM';
    }
    
    if (startHour >= endHour) {
      return 'End time must be after start time';
    }
    
    return null;
  };

  // Modified time change handlers
  const handleFromTimeChange = (e) => {
    const time24 = e.target.value;
    setFromTime(time24);
    const timeValidation = validateTime(time24, toTime);
    setTimeError(timeValidation || '');
  };

  const handleToTimeChange = (e) => {
    const time24 = e.target.value;
    setToTime(time24);
    const timeValidation = validateTime(fromTime, time24);
    setTimeError(timeValidation || '');
  };

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


  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin');
    } else if (status === 'authenticated' && session?.user?.role !== 'TeamLead') {
      router.push('/');
    }
  }, [status, session?.user?.role, router]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'TeamLead') {
      fetchStudents();
    }
  }, []); 

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        search: searchTerm,
        section: selectedSection,
        year: selectedYear
      });
  
      let studentsData = [];
      let countsData = [];
  
      try {
        const studentsResponse = await fetch(`/api/students?${params}`);
        if (!studentsResponse.ok) {
          throw new Error(`Students API Error: ${studentsResponse.status}`);
        }
        studentsData = await studentsResponse.json();
      } catch (studentError) {
        console.error('Students fetch error:', studentError);
        throw new Error('Failed to fetch students data');
      }
  
      try {
        const countsResponse = await fetch('/api/counts');
        if (!countsResponse.ok) {
          throw new Error(`Counts API Error: ${countsResponse.status}`);
        }
        countsData = await countsResponse.json();
      } catch (countsError) {
        console.error('Counts fetch error:', countsError);
        countsData = [];
      }
  
      const countsArray = Array.isArray(countsData) ? countsData : [];
      
      const countsMap = new Map(
        countsArray.map(count => [count.email, count])
      );
      
      const studentsWithCounts = studentsData.map(student => {
        const studentCounts = countsMap.get(student.email);
        return {
          ...student,
          counts: studentCounts || {
            stayback_cnt: 0,
            meeting_cnt: 0,
            email: student.email
          }
        };
      });
  
      setStudents(studentsWithCounts);
    } catch (error) {
      console.error('Fetch error:', error);
      setError(error.message || 'Failed to fetch data');
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        router.push('/api/auth/signin');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status !== 'authenticated' || session?.user?.role !== 'TeamLead') return;

    const debounceTimer = setTimeout(() => {
      fetchStudents();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, selectedSection, selectedYear]);

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSection = selectedSection === 'all' || student.sec === selectedSection;
    const matchesYear = selectedYear === 'all' || student.year === parseInt(selectedYear);
    return matchesSearch && matchesSection && matchesYear;
  });

  const totalStudents = filteredStudents;
  const totalPages = Math.ceil(totalStudents.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalStudents.length);
  const currentStudents = filteredStudents.slice(startIndex, endIndex);

  const handleSelectStudent = (userId) => {
    setSelectedStudents(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };



  const validateForm = () => {
    if (selectedStudents.length === 0) return 'Please select at least one student';
    if (!reason) return 'Please enter a reason';
    if (!description) return 'Please enter a description';
    if (!fromTime) return 'Please select start time';
    if (!toTime) return 'Please select end time';
    if (fromTime >= toTime) return 'End time must be after start time';
    const timeValidation = validateTime(fromTime, toTime);
    if (timeValidation) return timeValidation;
    return null;
  };

  const handleSendRequest = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const requests = selectedStudents.map(userId => ({
        user_id: userId,
        reason,
        description,
        from_time: new Date(`2024-01-01T${fromTime}`).toISOString(),
        to_time: new Date(`2024-01-01T${toTime}`).toISOString(),
        request_type: 'OD Request',
        teamlead_id: session.user.id
      }));

      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });

      if (response.status === 401) {
        router.push('/api/auth/signin');
        return;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send request');
      }

      setSuccessMessage('Requests sent successfully');
      setSelectedStudents([]);
      setReason('');
      setDescription('');
      setFromTime('');
      setToTime('');
      
      await fetchStudents();
    } catch (error) {
      setError('Failed to send request: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl">
        {/* Header Section */}
        <div className="border-b border-gray-200 bg-gray-50 rounded-t-2xl px-6 py-5">
          <div className='flex flex-row'>
        <div className="flex-shrink-0 flex flex-row">
              <img 
                className="w-36 h-36 rounded object-contain" 
                src="/logo.png" 
                alt="Company Logo" 
              />
            </div>
          <h1 className="text-2xl px-36 py-10 md:text-3xl font-bold text-black">
            Send OD Request
          </h1>
          </div>
        </div>
        

        <div className="p-6 space-y-6">
          {/* Alert Messages */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
              <p className="text-red-700">{error}</p>
            </div>
          )}
          {successMessage && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-md">
              <p className="text-green-700">{successMessage}</p>
            </div>
          )}

          {/* Search and Filter Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Sections</option>
              {sectionsOptions.map((section) => (
                <option key={section} value={section}>
                  Section {section}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Years</option>
              {yearsOptions.map((year) => (
                <option key={year} value={year}>
                  Year {year}
                </option>
              ))}
            </select>
          </div>

          {/* Table Section */}
          <div className="relative overflow-hidden rounded-lg border border-gray-200">
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-black-900">Select</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-black-900">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-black-900">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-black-900">Section</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-black-900">Year</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-black-900">Stayback</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-black-900">Meeting</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {loading ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-4 text-center text-sm text-black-500">
                          Loading...
                        </td>
                      </tr>
                    ) : (
                      currentStudents.map((student) => (
                        <tr 
                          key={student.user_id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(student.user_id)}
                              onChange={() => handleSelectStudent(student.user_id)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-black-900">{student.name}</td>
                          <td className="px-4 py-3 text-sm text-black-600">{student.email}</td>
                          <td className="px-4 py-3 text-sm text-black-600">{student.sec}</td>
                          <td className="px-4 py-3 text-sm text-black-600">{student.year}</td>
                          <td className="px-4 py-3 text-sm text-black-600">{student.counts?.stayback_cnt || 0}</td>
                          <td className="px-4 py-3 text-sm text-black-600">{student.counts?.meeting_cnt || 0}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-black">
              Showing {startIndex + 1} to {endIndex} of {totalStudents.length} entries
            </div>
            <div className="flex space-x-1">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1 border rounded-md text-sm font-medium ${
                    currentPage === i + 1
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
          <div>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Select Team</option>
        {teamOptions.map((team) => (
          <option key={team} value={team}>
            {team}
          </option>
        ))}
      </select>
    </div>
            <div>
            <textarea
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows="3"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Start Time
      </label>
      <input
        type="time"
        value={fromTime}
        onChange={handleFromTimeChange}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {fromTime && (
        <span className="text-sm text-gray-500 mt-1 block">
          {convertTo12Hour(fromTime)}
        </span>
      )}
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        End Time
      </label>
      <input
        type="time"
        value={toTime}
        onChange={handleToTimeChange}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {toTime && (
        <span className="text-sm text-gray-500 mt-1 block">
          {convertTo12Hour(toTime)}
        </span>
      )}
    </div>
  </div>
  {timeError && (
    <div className="mt-2 text-sm text-red-600">
      {timeError}
    </div>
  )}
            {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <input
                  type="time"
                  value={fromTime}
                  onChange={(e) => setFromTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <input
                  type="time"
                  value={toTime}
                  onChange={(e) => setToTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div> */}
          </div>
        </div>

        {/* Footer Section */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-2xl">
          <button
            onClick={handleSendRequest}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Send Request
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequestForm;