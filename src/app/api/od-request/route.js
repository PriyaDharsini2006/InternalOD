//app/api/od-request/route.js
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const teamLeadId = searchParams.get('teamLeadId');

    // Base query for fetching OD requests
    const whereCondition = {
      ...(status !== null && { status: parseInt(status) }),
      ...(teamLeadId && { teamlead_id: parseInt(teamLeadId) })
    };

    const requests = await prisma.oDRequest.findMany({
      where: whereCondition,
      include: {
        user: {
          select: {
            name: true,
            sec: true,
            year: true,
            user_id: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    // Transform requests to include user details
    const transformedRequests = requests.map(request => ({
      od_id: request.id,
      user_id: request.user_id,
      name: request.user.name,
      sec: request.user.sec,
      year: request.user.year,
      reason: request.reason,
      description: request.description,
      from_time: request.from_time,
      to_time: request.to_time,
      status: request.status,
      request_type: request.request_type,
      date: request.date
    }));

    return NextResponse.json(transformedRequests, { status: 200 });
  } catch (error) {
    console.error('Error fetching OD requests:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch OD requests', 
      details: error.message 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request) {
  try {
    const requestData = await request.json();

    // Validate required fields
    const { 
      user_id, 
      reason, 
      description, 
      teamlead_id, 
      from_time, 
      to_time, 
      request_type 
    } = requestData;

    // Create OD request
    const newRequest = await prisma.oDRequest.create({
      data: {
        user_id,
        reason,
        description,
        teamlead_id,
        from_time: new Date(from_time),
        to_time: new Date(to_time),
        request_type
      }
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating OD request:', error);
    return NextResponse.json({ 
      error: 'Failed to create OD request', 
      details: error.message 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const requestData = await request.json();

    switch(action) {
      case 'bulk_approve':
        return await bulkApproveRequests(requestData);
      
      case 'bulk_reject':
        return await bulkRejectRequests(requestData);
      
      case 'modify_timings':
        return await modifyRequestTimings(requestData);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ 
      error: 'Failed to process request', 
      details: error.message 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// Bulk approve requests
async function bulkApproveRequests(requestIds) {
  const approvedRequests = await prisma.oDRequest.updateMany({
    where: {
      id: { in: requestIds }
    },
    data: {
      status: 1  // Approved status
    }
  });

  return NextResponse.json(approvedRequests, { status: 200 });
}

// Bulk reject requests
async function bulkRejectRequests(requestIds) {
  const rejectedRequests = await prisma.oDRequest.updateMany({
    where: {
      id: { in: requestIds }
    },
    data: {
      status: -1  // Rejected status
    }
  });

  return NextResponse.json(rejectedRequests, { status: 200 });
}

// Modify request timings
async function modifyRequestTimings(data) {
  const { requestIds, from_time, to_time } = data;

  const updatedRequests = await prisma.oDRequest.updateMany({
    where: {
      id: { in: requestIds }
    },
    data: {
      from_time: new Date(from_time),
      to_time: new Date(to_time)
    }
  });

  return NextResponse.json(updatedRequests, { status: 200 });
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('id');

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const deletedRequest = await prisma.oDRequest.delete({
      where: { id: requestId }
    });

    return NextResponse.json(deletedRequest, { status: 200 });
  } catch (error) {
    console.error('Error deleting OD request:', error);
    return NextResponse.json({ 
      error: 'Failed to delete OD request', 
      details: error.message 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}