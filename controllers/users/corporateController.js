const Company = require("../../models/companyModel");
const Plan = require("../../models/planModel");
const User = require("../../models/userModel");
const ErrorResponse = require("../../utils/errorResponse");
const asyncHandler = require("../../middleware/asyncHandler");
const bcrypt = require("bcrypt");

//create Corporate Customer
exports.createCorporatelUser = asyncHandler(async (req, res, next) => {
  try {
    const company = req.params.company;
    const {
      dob,
      idNumber,
      idType,
      address,
      contact1,
      contact2,
      email,
      enrolmentDate,
      memberShipID,
      firstName,
      manager,
      gender,
      lastName,
      monthlyFee,
      plan,
      password,
      
    } = req.body;

    const requiredFields = [
      dob,
      idNumber,
      idType,
      address,
      contact1,
      contact2,
      email,
      enrolmentDate,
      memberShipID,
      firstName,
      manager,
      gender,
      lastName,
      monthlyFee,
      plan,
      company
    ];

    if (requiredFields.some((field) => !field)) {
      return next(new ErrorResponse("Fields cannot be null", 400));
    }
    // Check if contact is a valid number
    if (isNaN(contact1) || isNaN(contact2) || isNaN(monthlyFee)) {
      return next(new ErrorResponse("Validate all fields", 400));
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(
        new ErrorResponse("User with the same data already exists", 400)
      );
    }
    const existingUserByMemberShipID = await User.findOne({ memberShipID });
    if (existingUserByMemberShipID) {
      return res.status(400).json({
        success: false,
        error: "User with the same memberShipID already exists",
      });
    }


    const existingPlan = await Plan.findById(plan);
    if (!existingPlan) {
      return next(new ErrorResponse("Plan doesn't exist, please check", 400));
    }

    const avatar = req.file?.path;

    // Use the same hashing logic as in the model's pre-save hook
    let hashedPassword = password;
    if (!hashedPassword) {
      hashedPassword = await bcrypt.hash("mediplus", 10);
    }

    const customer = await User.create({
      dob,
      idNumber,
      idType,
      address,
      contact1,
      contact2,
      email,
      enrolmentDate,
      memberShipID,
      firstName,
      gender,
      lastName,
      manager,
      monthlyFee,
      plan,
      relation: "Main",
      role: 4,
      avatar,
      company,
      userType: 4,
      password: hashedPassword,
      user: req.user.id,
    });

    res.status(201).json({
      success: true,
      customer,
    });
  } catch (error) {
    next(error);
  }
});

// Bulk create corporate user
exports.BulkCreateCorporatelUser2 = async (req, res, next) => {
  console.log('Function is called');
  try {
    const company = req.params.company;
    const csvContent = req.body.csvContent; // Access the CSV content from the request body
    const { manager } = req.body;

    console.log('Company:', company);
    console.log('Manager:', manager);

    if (!csvContent) {
      console.log('No CSV content provided');
      return res.status(400).json({ error: 'No CSV content provided' });
    }

    const users = [];

    // Parse the CSV content
    csvContent.split(/\r?\n/).forEach((line, index) => {
      if (index === 0 || !line.trim()) return; // Skip the header row
      const [
        firstName,
        lastName,
        dob,
        idType,
        idNumber,
        gender,
        contact1,
        contact2,
        email,
        address,
        enrolmentDate,
        memberShipID,
        monthlyFee,
        plan,
      ] = line.split(';'); // Adjust this based on your CSV structure

      console.log('Line:', line);
      console.log('Parsed Data:', {
        firstName,
        lastName,
        dob,
        idType,
        idNumber,
        gender,
        contact1,
        contact2,
        email,
        address,
        enrolmentDate,
        memberShipID,
        monthlyFee,
        plan,
      });

      // Remove commas from contact1 and contact2 and parse them as numbers
  const parsedContact1 = parseFloat(contact1.replace(/,/g, ''));
  const parsedContact2 = parseFloat(contact2.replace(/,/g, ''));

      // Create an object with user data
      const user = {
        dob,
        idNumber,
        idType,
        address,
        contact1,
        contact2,
        email,
        enrolmentDate,
        memberShipID,
        firstName,
        gender,
        lastName,
        manager,
        monthlyFee,
        plan,
        relation: 'Main',
        role: 4,
        avatar: '', // You can set this to an empty string for now
        company,
        userType: 4,
      };

      console.log('User Data:', user);

      // Validate user data here (similar to your existing code)
      const requiredFields = [
        dob,
        idNumber,
        idType,
        address,
        contact1,
        contact2,
        email,
        enrolmentDate,
        memberShipID,
        firstName,
        manager,
        gender,
        lastName,
        monthlyFee,
        plan,
        company,
      ];

      if (requiredFields.some((field) => !field)) {
        console.log('Validation Error: Fields cannot be null');
        throw new Error('Fields cannot be null');
      }

      if (isNaN(contact1) || isNaN(contact2) || isNaN(monthlyFee)) {
        console.log('Validation Error: Validate all fields');
        throw new Error('Validate all fields');
      }

      users.push(user);
    });

    // Now, 'users' array contains user data from the CSV content
    // You can loop through 'users' and create users in your database

    console.log('Users:', users);

    const createdUsers = await Promise.all(users.map(async (user) => {
      // Use the same hashing logic as in your model's pre-save hook
      let hashedPassword = user.password;
      if (!hashedPassword) {
        hashedPassword = await bcrypt.hash('mediplus', 10);
      }

      // Create the user in your database (similar to your existing code)
      const customer = await User.create({
        ...user,
        password: hashedPassword,
        user: req.user.id,
      });

      return customer;
    }));

    console.log('Created Users:', createdUsers);

    res.status(201).json({
      success: true,
      customers: createdUsers,
    });
  } catch (error) {
    console.error('Error:', error);

    // Handle all errors consistently and send detailed error responses
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Bulk create corporate user
exports.BulkCreateCorporatelUser1 = async (req, res, next) => {
  try {
    const company = req.params.company;
    const csvContent = req.body.csvContent; // Access the CSV content from the request body
    const { manager } = req.body;

    if (!csvContent) {
      return res.status(400).json({ error: 'No CSV content provided' });
    }

    const users = [];

    // Parse the CSV content
    csvContent.split(/\r?\n/).forEach((line, index) => {
      if (index === 0 || !line.trim()) return; // Skip the header row
      const [
        firstName,
        lastName,
        dob,
        idType,
        idNumber,
        gender,
        contact1,
        contact2,
        email,
        address,
        enrolmentDate,
        memberShipID,
        monthlyFee,
        planId, // Assuming plan ID is included in the CSV
      ] = line.split(';'); // Adjust this based on your CSV structure

      // Check if the provided plan ID is valid
      const plan = Plan.findById(planId);

      if (!plan) {
        return res.status(400).json({ error: 'Invalid plan ID' });
      }

      // Remove commas from contact1 and contact2 and parse them as numbers
  const parsedContact1 = parseFloat(contact1.replace(/,/g, ''));
  const parsedContact2 = parseFloat(contact2.replace(/,/g, ''));

      // Create an object with user data
      const user = {
        dob,
        idNumber,
        idType,
        address,
        contact1,
        contact2,
        email,
        enrolmentDate,
        memberShipID,
        firstName,
        gender,
        lastName,
        manager,
        monthlyFee,
        plan: planId, // Set the plan to the valid plan ID
        relation: 'Main',
        role: 4,
        avatar: '', // You can set this to an empty string for now
        company,
        userType: 4,
      };

      // Validate user data here (similar to your existing code)
      const requiredFields = [
        dob,
        idNumber,
        idType,
        address,
        contact1,
        contact2,
        email,
        enrolmentDate,
        memberShipID,
        firstName,
        manager,
        gender,
        lastName,
        monthlyFee,
        planId, // Added planId to the required fields
        company,
      ];

      if (requiredFields.some((field) => !field)) {
        return res.status(400).json({ error: 'Fields cannot be null' });
      }

      if (isNaN(contact1) || isNaN(contact2) || isNaN(monthlyFee)) {
        return res.status(400).json({ error: 'Validate all fields' });
      }

      users.push(user);
    });

    // Now, 'users' array contains user data from the CSV content
    // You can loop through 'users' and create users in your database

    const createdUsers = await Promise.all(users.map(async (user) => {
      // Use the same hashing logic as in your model's pre-save hook
      let hashedPassword = user.password;
      if (!hashedPassword) {
        hashedPassword = await bcrypt.hash('mediplus', 10);
      }

      // Create the user in your database (similar to your existing code)
      const customer = await User.create({
        ...user,
        password: hashedPassword,
        user: req.user.id,
      });

      return customer;
    }));

    res.status(201).json({
      success: true,
      customers: createdUsers,
    });
  } catch (error) {
    console.error('Error:', error);

    // Handle all errors consistently and send detailed error responses
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.BulkCreateCorporatelUser = async (req, res, next) => {

  try {
    const company = req.params.company;
    const csvContent = req.body.csvContent; // Access the CSV content from the request body
    const { manager } = req.body;


    if (!csvContent) {

      return res.status(400).json({ error: 'No CSV content provided' });
    }

    const users = [];

    // Parse the CSV content
    const lines = csvContent.split(/\r?\n/);

    for (let index = 1; index < lines.length; index++) {
      const line = lines[index];

      // Skip empty lines
      if (!line.trim()) continue;

      const [
        firstName,
        lastName,
        dob,
        idType,
        idNumber,
        gender,
        contact1,
        contact2,
        email,
        address,
        enrolmentDate,
        memberShipID,
        monthlyFee,
        plan,
      ] = line.split(';'); // Adjust this based on your CSV structure

      // const plans = Plan.findById(plan);

      // if (!plans) {
      //   return res.status(400).json({ error: 'Invalid plan ID' });
      // }

      if (memberShipID) {
        // Check if the 'memberShipID' already exists in the database
        const existingUser = await User.findOne({ memberShipID });
      
        if (existingUser) {
          return res.status(400).json({ error: 'memberShipID must be unique' });
        }
      }
      if (contact1) {
        // Check if the 'memberShipID' already exists in the database
        const existingUser = await User.findOne({ contact1 });
      
        if (existingUser) {
          return res.status(400).json({ error: 'Contact must be unique' });
        }
      }
      if (plan) {
        // Check if the 'memberShipID' already exists in the database
        const existingPlan = await Plan.findOne({ plan });
      
        if (!existingPlan) {
          return res.status(400).json({ error: `Plan ${plan} dont exist, please validate` });
        }
      }

      // Remove commas from contact1 and contact2 and parse them as numbers
      const parsedContact1 = parseFloat(contact1.replace(/,/g, ''));
      const parsedContact2 = parseFloat(contact2.replace(/,/g, ''));

      // Check if any required field is empty
      const requiredFields = [
        dob,
        idNumber,
        idType,
        address,
        contact1,
        contact2,
        email,
        enrolmentDate,
        memberShipID,
        firstName,
        manager,
        gender,
        lastName,
        monthlyFee,
        plan,
        company,
      ];

      const emptyFields = requiredFields.filter((field, fieldIndex) => {
        if (!field) {
          console.log(`Validation Error: Field at line ${index}, column ${fieldIndex} cannot be null`);
          return true;
        }
        return false;
      });
    
      if (emptyFields.length > 0) {
        throw new Error('Fields cannot be null');
      }

      if (requiredFields.some((field) => !field)) {
        console.log('Validation Error: Fields cannot be null');
        throw new Error('Fields cannot be null');
      }

      // Check if numeric fields are valid numbers
      if (isNaN(parsedContact1) || isNaN(parsedContact2) || isNaN(monthlyFee)) {
        console.log('Validation Error: Validate all fields');
        throw new Error('Validate all fields');
      }

      // Create an object with user data
      const user = {
        dob,
        idNumber,
        idType,
        address,
        contact1: parsedContact1,
        contact2: parsedContact2,
        email,
        enrolmentDate,
        memberShipID,
        firstName,
        gender,
        lastName,
        manager,
        monthlyFee,
        plan,
        relation: 'Main',
        role: 4,
        avatar: '', // You can set this to an empty string for now
        company,
        userType: 4,
      };

      users.push(user);
    }

    // Now, 'users' array contains user data from the CSV content
    // You can loop through 'users' and create users in your database

    console.log('Users:', users);

    const createdUsers = await Promise.all(users.map(async (user) => {
      // Use the same hashing logic as in your model's pre-save hook
      let hashedPassword = user.password;
      if (!hashedPassword) {
        hashedPassword = await bcrypt.hash('mediplus', 10);
      }

      // Create the user in your database (similar to your existing code)
      const customer = await User.create({
        ...user,
        password: hashedPassword,
        user: req.user.id,
      });

      return customer;
    }));

    console.log('Created Users:', createdUsers);

    res.status(201).json({
      success: true,
      customers: createdUsers,
    });
  } catch (error) {
    console.error('Error:', error);

    // Handle all errors consistently and send detailed error responses
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

//update Company
exports.editCorporatelUser = asyncHandler(async (req, res, next) => {
  const company = req.params.company;
  const avatar = req.file?.path;

  const {
    dob,
    idNumber,
    idType,
    address,
    contact1,
    contact2,
    email,
    enrolmentDate,
    memberShipID,
    firstName,
    manager,
    gender,
    lastName,
    monthlyFee,
    plan,
    status,
    relation,
    password
  } = req.body;

  const requiredFields = [
    dob,
    idNumber,
    idType,
    address,
    contact1,
    contact2,
    email,
    enrolmentDate,
    memberShipID,
    firstName,
    manager,
    gender,
    lastName,
    monthlyFee,
    plan,
    status,
    relation
  ];

  if (requiredFields.some((field) => !field)) {
    return next(new ErrorResponse("Fields cannot be null", 400));
  }
  // Check if contact is a valid number
  if (isNaN(contact1) || isNaN(contact2) || isNaN(monthlyFee)) {
    return next(new ErrorResponse("Contact must be a number", 400));
  }

  // Check if plan  exists for the given plan
  // console.log(plan)
  // Check if serviceName already exists for the given plan
  if (!(await Plan.exists({ _id: plan }))) {
    return next(new ErrorResponse("Plan doesn't exist, please check", 400));
  }

  let hashedPassword = password;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

  const updatedCompany = await User.findByIdAndUpdate(
    company,
    {
      dob,
      idNumber,
      idType,
      address,
      contact1,
      contact2,
      email,
      enrolmentDate,
      memberShipID,
      firstName,
      manager,
      gender,
      lastName,
      monthlyFee,
      plan,
      relation,
      role: 4,
      avatar,
      userType: 4,
      status,
      password: hashedPassword,
      user: req.user.id,
    },
    { new: true }
  );

  if (!updatedCompany) {
    return next(new ErrorResponse("Service not found", 404));
  }

  res.status(200).json({
    success: true,
    company: updatedCompany,
  });
});


exports.getAllCorporateCustomer = async (req, res, next) => {
  let pageSize = Number(req.query.pageSize) || 10;
  let page = Number(req.query.pageNumber) || 1;
  const searchTerm = req.query.searchTerm;

  // Validate pageSize and pageNumber
  if (pageSize <= 0) {
    return res.status(400).json({ success: false, error: "Invalid pageSize. Must be greater than 0" });
  }

  if (page <= 0) {
    return res.status(400).json({ success: false, error: "Invalid pageNumber. Must be greater than 0" });
  }

  try {
    let query = { userType: 4 };

    if (searchTerm) {
      query = {
        $and: [
          { userType: 4 },
          {
            $or: [
              { firstName: { $regex: searchTerm, $options: "i" } },
              { lastName: { $regex: searchTerm, $options: "i" } },
              { idNumber: { $regex: searchTerm, $options: "i" } },
              { contact1: { $regex: searchTerm, $options: "i" } },
              { contact2: { $regex: searchTerm, $options: "i" } },
              { memberShipID: { $regex: searchTerm, $options: "i" } },
              { relation: { $regex: searchTerm, $options: "i" } },
            ],
          },
        ],
      };

      const dateSearch = new Date(searchTerm);
      if (!isNaN(dateSearch)) {
        query.$and.push({ enrolmentDate: dateSearch });
      }
    }

    const count = await User.countDocuments(query);

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .select("-password")
      .populate({
        path: "plan",
        populate: {
          path: "planService",
          model: "PlanServices",
        },
      })
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    const userWithPlans = users.map((user) => {
      // Check if the user has a plan and if the plan array is not empty
      if (user.plan && user.plan.length > 0) {
        // Calculate updated remaining balance for each service in the user's plan
        const updatedPlanService = user.plan[0].planService.map((service) => {
          const spentOnService = service.servicePrice - (service.remainingBalance || 0);
          const updatedRemainingBalance = service.servicePrice - spentOnService;
          return { ...service.toObject(), remainingBalance: updatedRemainingBalance };
        });

        return {
          ...user.toObject(),
          plan: [
            {
              ...user.plan[0].toObject(),
              planService: updatedPlanService,
            },
          ],
        };
      } else {
        // If the user has no plan or the plan array is empty, return the user as is
        return { ...user.toObject(), plan: [] };
      }
    });

    res.status(200).json({
      success: true,
      users: userWithPlans,
      page,
      pages: Math.ceil(count / pageSize),
      count,
    });
  } catch (error) {
    return next(error);
  }
};




const fs = require("fs");
const path = require("path");

exports.deleteFile = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const fileName = req.body.file; // Assuming the file name is passed in the request body

    // Check if the user ID and file name are provided
    if (!userId || !fileName) {
      return res.status(400).json({
        success: false,
        message: "User ID and file name are required",
      });
    }

    try {
      // Remove the file entry from the User table
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Remove the file name from the user's file string
      const files = user.multipleFiles.split(",");
      const fileIndex = files.indexOf(fileName);
      if (fileIndex !== -1) {
        files.splice(fileIndex, 1);
        user.multipleFiles = files.join(",");
        await user.save();
      }

      res.status(200).json({
        success: true,
        message: "File deleted",
      });
    } catch (error) {
      console.error("Error deleting file from User table:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete the file from the User table",
      });
    }
  } catch (error) {
    return next(error);
  }
};
