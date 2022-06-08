import Job from '../models/Job.js'
import { StatusCodes } from 'http-status-codes'

import {
  BadRequestError,
  NotFoundError,
  UnAuthenticatedError,
} from '../errors/index.js'

import checkPermissions from '../utils/checkPermissions.js'
import mongoose from 'mongoose'

// to handle data type
import moment from 'moment'

const createJob = async (req, res) => {
  const { position, company } = req.body

  if (!position || !company) {
    throw new BadRequestError('Please provide all values')
  }
  // userId.It is from the authorization middleware
  req.body.createdBy = req.user.userId
  const job = await Job.create(req.body)
  res.status(StatusCodes.CREATED).json({ job })
}

const getAllJobs = async (req, res) => {
  const { status, jobType, sort, search } = req.query

  const queryObject = {
    createdBy: req.user.userId,
  }
  
  // add stuff based on condition
  if (status && status !== 'all') {
    queryObject.status = status
  }
  if (jobType && jobType !== 'all') {
    queryObject.jobType = jobType
  }
  if (search) {
    //option i for a case insensitive search
    queryObject.position = { $regex: search, $options: 'i' }
  }
  
  // no await here
  let result = Job.find(queryObject)

  
  // chain sort conditions
  if (sort === 'latest') {
    result = result.sort('-createdAt')
  }
  if (sort === 'oldest') {
    result = result.sort('createdAt')
  }
  if (sort === 'a-z') {
    result = result.sort('position')
  }
  if (sort === 'z-a') {
    result = result.sort('-position')
  }

  //

  // setup pagination
  const page = Number(req.query.page) || 1 
  const limit = Number(req.query.limit) || 10
  const skip = (page - 1) * limit

  result = result.skip(skip).limit(limit)

  const jobs = await result

  // count all jobs 
  const totalJobs = await Job.countDocuments(queryObject)
  // round to ceil
  const numOfPages = Math.ceil(totalJobs / limit)

  res.status(StatusCodes.OK).json({ jobs, totalJobs, numOfPages })
}
const updateJob = async (req, res) => {
  const { id: jobId } = req.params
  const { company, position } = req.body

  if (!position || !company) {
    throw new BadRequestError('Please provide all values')
  }
  const job = await Job.findOne({ _id: jobId })

  if (!job) {
    throw new NotFoundError(`No job with id :${jobId}`)
  }
  
  // check permissions
  // params: string, object
  checkPermissions(req.user, job.createdBy)

  const updatedJob = await Job.findOneAndUpdate({ _id: jobId }, req.body, {
    // to return data
    new: true,
    // to trigger validators
    runValidators: true,
  })

  res.status(StatusCodes.OK).json({ updatedJob })
}
const deleteJob = async (req, res) => {
  const { id: jobId } = req.params

  const job = await Job.findOne({ _id: jobId })

  if (!job) {
    throw new NotFoundError(`No job with id :${jobId}`)
  }

  checkPermissions(req.user, job.createdBy)

  await job.remove()

  res.status(StatusCodes.OK).json({ msg: 'Success! Job removed' })
}
const showStats = async (req, res) => {
  let stats = await Job.aggregate([
    { $match: { createdBy: mongoose.Types.ObjectId(req.user.userId) } },
    //group by status and count 
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ])
  stats = stats.reduce((acc, curr) => {
    const { _id: title, count } = curr
    acc[title] = count
    return acc
  }, {})

  // if no jobs with that status
  const defaultStats = {
    pending: stats.pending || 0,
    interview: stats.interview || 0,
    declined: stats.declined || 0,
  }

  let monthlyApplications = await Job.aggregate([
    { $match: { createdBy: mongoose.Types.ObjectId(req.user.userId) } },
    {
      // group by year and month and count
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    // sort to get 6 latest
    { $sort: { '_id.year': -1, '_id.month': -1 } },
    { $limit: 6 },
  ])

  monthlyApplications = monthlyApplications
    .map((item) => {
      const {
        _id: { year, month },
        count,
      } = item

      // formate date for front-end
      const date = moment()
        .month(month - 1)
        .year(year)
        .format('MMM Y')
        
      return { date, count }
    })
    .reverse() 

  res.status(StatusCodes.OK).json({ defaultStats, monthlyApplications })
}

export { createJob, deleteJob, getAllJobs, updateJob, showStats }
