exports.createTransaction = async (req, res) => {
    try {
      const { customerId, planId, serviceId, paymentMethod, amount } = req.body;
  
      const customer = await User.findById(customerId).populate({
        path: "plan",
        populate: {
          path: "planService",
          model: "PlanServices",
        },
      });
  
      if (!customer) {
        return res.status(404).json({ success: false, error: "Customer not found" });
      }
  
      const selectedPlan = customer.plan[0];
  
      if (!selectedPlan || !selectedPlan.planService) {
        return res.status(404).json({ success: false, error: "Plan not found for the customer" });
      }
  
      const selectedService = selectedPlan.planService.find((service) => service._id.toString() === serviceId);
  
      if (!selectedService) {
        return res.status(404).json({ success: false, error: "Service not found in the customer's plan" });
      }
  
      if (selectedService.servicePrice > amount) {
        // Calculate the updated remainingBalance
        const updatedRemainingBalance = selectedService.servicePrice - amount;
  
        // Update the selectedService's remainingBalance in the database
        selectedService.remainingBalance = updatedRemainingBalance;
        await selectedService.save();
      }
  
      res.status(201).json({ success: true, PlanServices: selectedService });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: "Something went wrong" });
    }
  };
  