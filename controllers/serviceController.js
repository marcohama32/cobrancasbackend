const Plan = require("../models/planModel");
const PlanService = require("../models/serviceModel");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/asyncHandler");

// Create service and add it to a plan
exports.createServiceForPlan = asyncHandler(async (req, res, next) => {
  const {
    planId,
    serviceName,
    servicePrice,
    serviceDescription,
    serviceAreaOfCover,
    preAuthorization,
  } = req.body;
  try {
    if (
      !planId ||
      !serviceName ||
      !servicePrice ||
      !serviceDescription ||
      !serviceAreaOfCover ||
      !preAuthorization
    ) {
      return next(new ErrorResponse("Fields cannot be null", 400));
    }

    // Check if servicePrice is a valid number
    if (isNaN(servicePrice)) {
      return next(new ErrorResponse("Service price must be a number", 400));
    }

    // Find the plan to which we want to add the service and populate the planService array
    const plan = await Plan.findById(planId).populate("planService");

    if (!plan) {
      return next(new ErrorResponse("Plan not found", 404));
    }

    // Get the user reference from the req.user object
    const user = req.user.id;

    // Create the new service with the user and plan references
    const newService = await PlanService.create({
      serviceName,
      servicePrice: parseFloat(servicePrice),
      serviceDescription,
      serviceAreaOfCover,
      preAuthorization,
      user, // Add the user reference
    });

    // Ensure that plan.planService is an array or initialize it as an empty array
    plan.planService = plan.planService || [];

    // Add the new service to the plan's planService array
    plan.planService.push(newService);
    console.log("Plan Service Array:", plan.planService); // Debug line: Log the planService array

    // Calculate the total balance using map and reduce
    const totalBalance = plan.planService
      .map((service) => service.servicePrice)
      .reduce((sum, price) => sum + price, 0);
    console.log("Total Balance before saving:", totalBalance); // Debug line: Log the calculated totalBalance before saving

    plan.planTotalBalance = totalBalance;
    console.log("Plan Total Balance:", plan.planTotalBalance); // Debug line: Log the planTotalBalance before saving

    await plan.save();

    // Fetch the plan again from the database to verify the updated planTotalBalance
    const updatedPlan = await Plan.findById(planId);
    console.log("Updated Plan Total Balance:", updatedPlan.planTotalBalance); // Debug line: Log the updated planTotalBalance

    res.status(201).json({ success: true, service: newService });
  } catch (error) {
    next(error);
  }
});


//find plan by id
exports.singleService = asyncHandler(async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.service_id)
      

    if (!service) {
      return next(new ErrorResponse("Service not found", 404));
    }

    res.status(200).json({
      success: true,
      service,
    });
  } catch (error) {
    next(error);
  }
});

// Update a service by ID
exports.updatedService = asyncHandler(async (req, res, next) => {
  const {
    serviceName,
    servicePrice,
    serviceDescription,
    serviceAreaOfCover,
    preAuthorization,
  } = req.body;

  try {
    // Get the service ID from the request parameters
    const serviceId = req.params.id;

    // Check if servicePrice is a valid number
    if (isNaN(servicePrice)) {
      return next(new ErrorResponse("Service price must be a number", 400));
    }

    // Find the service by its ID
    let service = await PlanService.findById(serviceId);

    if (!service) {
      return next(new ErrorResponse("Service not found", 404));
    }

    // Find the plan associated with the service
    const plan = await Plan.findOne({ planService: serviceId }).populate('planService');

    if (!plan) {
      return next(new ErrorResponse("Plan not found", 404));
    }

    // Update the service with the new values
    service.serviceName = serviceName;
    service.servicePrice = parseFloat(servicePrice);
    service.serviceDescription = serviceDescription;
    service.serviceAreaOfCover = serviceAreaOfCover;
    service.preAuthorization = preAuthorization;

    // Save the updated service
    service = await service.save();

    // Recalculate the plan's total balance using map and reduce
    const totalBalance = plan.planService.reduce((sum, s) => {
      if (typeof s.servicePrice === 'number') {
        return sum + s.servicePrice;
      }
      return sum;
    }, 0);

    plan.planTotalBalance = totalBalance;

    // Save the updated plan
    await plan.save();

    res.status(200).json({ success: true, service, plan });
  } catch (error) {
    next(error);
  }
});

//update plan
exports.updatedService1 = asyncHandler(async (req, res, next) => {
  const id = req.params.id;
  const { serviceName, plan, servicePrice, serviceDescription } = req.body;

  if (!id || !serviceName || !plan || !servicePrice || !serviceDescription) {
    return next(new ErrorResponse("Fields cannot be null", 403));
  }
  // Check if servicePrice is a valid number
  if (isNaN(servicePrice)) {
    return next(new ErrorResponse("Service price must be a number", 400));
  }


  const updatedService = await Service.findByIdAndUpdate(
    id,
    { serviceName, plan, servicePrice, serviceDescription },
    { new: true }
  );

  if (!updatedService) {
    return next(new ErrorResponse("Service not found", 404));
  }

  res.status(200).json({
    success: true,
    service: updatedService,
  });
});

// Update a service by ID
exports.updatedService2 = asyncHandler(async (req, res, next) => {
  const {
    serviceName,
    servicePrice,
    serviceDescription,
    serviceAreaOfCover,
    preAuthorization,
  } = req.body;
  
  try {
    // Get the service ID from the request parameters
    const serviceId = req.params.id;
    
    // Check if servicePrice is a valid number
    if (isNaN(servicePrice)) {
      return next(new ErrorResponse("Service price must be a number", 400));
    }

    // Find the service by its ID
    let service = await PlanService.findById(serviceId);
    console.log(service.plan)

    if (!service) {
      return next(new ErrorResponse("Service not found", 404));
    }

    // Find the plan associated with the service
    const plan = await Plan.findById(service.plan);

    if (!plan) {
      return next(new ErrorResponse("Plan not found", 404));
    }

    // Update the service with the new values
    service.serviceName = serviceName;
    service.servicePrice = parseFloat(servicePrice);
    service.serviceDescription = serviceDescription;
    service.serviceAreaOfCover = serviceAreaOfCover;
    service.preAuthorization = preAuthorization;

    // Save the updated service
    service = await service.save();

    // Update the plan's planService array with the updated service details
    const planServiceIndex = plan.planService.findIndex((s) => s._id.toString() === serviceId);
    if (planServiceIndex !== -1) {
      plan.planService[planServiceIndex] = service;
    } else {
      return next(new ErrorResponse("Service not associated with the plan", 404));
    }

    // Recalculate the plan's total balance using map and reduce
    const totalBalance = plan.planService
      .map((s) => s.servicePrice)
      .reduce((sum, price) => sum + price, 0);

    plan.planTotalBalance = totalBalance;

    // Save the updated plan
    await plan.save();

    res.status(200).json({ success: true, service, plan });
  } catch (error) {
    next(error);
  }
});

//Get all all job category
exports.getAllService = asyncHandler(async (req, res, next) => {
  //enable seach
  const keyword = req.query.keyword
    ? {
        title: {
          $regex: req.query.keyword,
          $options: "i",
        },
      }
    : {};

  //enable pagination
  const pageSize = 5;
  const page = Number(req.query.pageNumber) || 1;

  // const count = await Job.find({ ...keyword }).estimatedDocumentCount();
  const count = await Service.find().countDocuments(); //jobType e o nome dentro do modelo job

  try {
    const service = await Service.find()
      .sort({ createdAt: -1 })
      .skip(pageSize * (page - 1))
      .limit(pageSize);
    res.status(200).json({
      success: true,
      page,
      service,
      pages: Math.ceil(count / pageSize),
      count,
    });
  } catch (error) {
    next(error);
  }
});

//delete plan
exports.deleteService = asyncHandler(async (req, res, next) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);

    if (!service) {
      return next(new ErrorResponse("Service not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Service deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

// Change a service to another plan
// Change a service to another plan
exports.changeServicePlan = asyncHandler(async (req, res, next) => {
  try {
    // Get the service ID and new plan ID from the request body
    const { serviceId, newPlanId } = req.body;

    // Check if the service exists
    const service = await Service.findById(serviceId);

    if (!service) {
      return next(new ErrorResponse("Service not found", 404));
    }

    // Find the current plan to which the service belongs
    const currentPlan = await Plan.findOne({ planService: serviceId });

    if (!currentPlan) {
      return next(new ErrorResponse("Current plan not found", 404));
    }

    // Find the new plan to which you want to add the service
    const newPlan = await Plan.findById(newPlanId);

    if (!newPlan) {
      return next(new ErrorResponse("New plan not found", 404));
    }

    // Remove the service from the current plan's planService array
    currentPlan.planService = currentPlan.planService.filter((s) => s.toString() !== serviceId);

    // Calculate the current plan's planTotalBalance after removing the service
    const currentPlanTotalBalance = currentPlan.planService
      .map((s) => s.servicePrice)
      .reduce((sum, price) => sum + price, 0);
    currentPlan.planTotalBalance = currentPlanTotalBalance;

    // Add the service to the new plan's planService array
    newPlan.planService.push(service);

    // Calculate the new plan's planTotalBalance after adding the service
    const newPlanTotalBalance = newPlan.planService
      .map((s) => s.servicePrice)
      .reduce((sum, price) => sum + price, 0);
    newPlan.planTotalBalance = newPlanTotalBalance;

    // Save both the current and new plans
    await currentPlan.save();
    await newPlan.save();

    res.status(200).json({ success: true, message: "Service changed to a new plan successfully" });
  } catch (error) {
    next(error);
  }
});