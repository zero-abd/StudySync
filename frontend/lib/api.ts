export async function fetchStudentData() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/get_student_data`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch student data');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching student data:', error);
    return null;
  }
} 