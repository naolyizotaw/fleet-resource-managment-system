Migration note: Enforcing unique assignedDriver on vehicles

We added a sparse unique index on `assignedDriver` in `vehicleModel.js` to enforce the business rule: one driver may be assigned to at most one vehicle.

Important:

- If your vehicles collection already contains multiple vehicles that reference the same driver, MongoDB will fail to create the unique index until duplicates are resolved.

Safe steps to apply the index in production/dev:

1. Inspect duplicates:

   - Connect to MongoDB and run:
     db.vehicles.aggregate([
     { $match: { assignedDriver: { $ne: null } } },
     { $group: { _id: "$assignedDriver", count: { $sum: 1 }, docs: { $push: "$_id" } } },
     { $match: { count: { $gt: 1 } } }
     ])
   - This returns drivers assigned to more than one vehicle.

2. Resolve duplicates manually or via script:

   - Decide which vehicle should keep the driver assignment and unset the others.
   - Example to unset a vehicle by id:
     db.vehicles.updateOne({ \_id: ObjectId("<id-to-unset>") }, { $unset: { assignedDriver: "" } })

3. Create the index (once duplicates resolved):

   - In Mongo shell or a one-off script run:
     db.vehicles.createIndex({ assignedDriver: 1 }, { unique: true, sparse: true })

4. Restart the backend server (if necessary) so Mongoose is aware of index changes.

Alternative (no-schema change): Controller-level checks were added to `vehicleController.js` to prevent assigning the same driver to multiple vehicles. This provides an application-level enforcement that is safe to deploy without immediate migration.

If you want help producing a migration script to detect and resolve duplicates, tell me how you'd like duplicates resolved (keep first, keep most-recent, or a manual list) and I can generate the script.
