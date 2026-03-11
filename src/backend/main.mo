import Time "mo:core/Time";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Char "mo:core/Char";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";


// Apply migration on upgrade due to infra-only change

actor {
  // ----------------------------------------
  // Type Definitions
  // ----------------------------------------
  public type UserProfile = {
    name : Text;
  };

  public type CourseRecord = {
    id : Nat;
    name : Text;
    year : Text;
    createdAt : Time.Time;
  };

  module CourseRecord {
    public func compare(a : CourseRecord, b : CourseRecord) : Order.Order {
      switch (Text.compare(a.name, b.name)) {
        case (#equal) { Text.compare(a.year, b.year) };
        case (order) { order };
      };
    };
  };

  public type PeriodRecord = {
    id : Nat;
    courseId : Nat;
    date : Text; // Format: YYYY-MM-DD
    periodNumber : Nat;
    summaryPrimary : Text;
    summarySecondary : Text;
    createdAt : Time.Time;
  };

  module PeriodRecord {
    public func compare(a : PeriodRecord, b : PeriodRecord) : Order.Order {
      if (a.courseId == b.courseId and a.date == b.date) {
        Nat.compare(a.periodNumber, b.periodNumber);
      } else {
        switch (Text.compare(a.date, b.date)) {
          case (#equal) { Nat.compare(a.courseId, b.courseId) };
          case (order) { order };
        };
      };
    };
  };

  public type PeriodInput = {
    courseId : Nat;
    date : Text; // Format: YYYY-MM-DD
    periodNumber : Nat;
    summaryPrimary : Text;
    summarySecondary : Text;
  };

  type Permission = {
    #admin;
    #user;
  };

  // ----------------------------------------
  // Persistent State (stable = survives upgrades)
  // ----------------------------------------
  stable var periodIdCounter = 0;
  stable var courseIdCounter = 0;

  let courses = Map.empty<Nat, CourseRecord>();
  let periods = Map.empty<Nat, PeriodRecord>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  let accessControlState = AccessControl.initState(); // Initialize access control state

  // Include authorization mixin
  include MixinAuthorization(accessControlState);

  // ----------------------------------------
  // Internal Utility Functions
  // ----------------------------------------
  func checkPermission(caller : Principal, permission : Permission) {
    switch (permission) {
      case (#admin) {
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Admin privileges required");
        };
      };
      case (#user) {
        if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
          Runtime.trap("Unauthorized: User privileges required");
        };
      };
    };
  };

  // ----------------------------------------
  // User Profile Management
  // ----------------------------------------
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    checkPermission(caller, #user);
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    checkPermission(caller, #user);
    userProfiles.add(caller, profile);
  };

  // ----------------------------------------
  // Course Management
  // ----------------------------------------
  public shared ({ caller }) func registerCourse(name : Text, year : Text) : async Nat {
    // Check for duplicate name/year (case-insensitive)
    let nameLower = name.map(
      func(c) {
        if (c >= 'A' and c <= 'Z') {
          Char.fromNat32(c.toNat32() + 32);
        } else { c };
      }
    );
    let yearLower = year.map(
      func(c) {
        if (c >= 'A' and c <= 'Z') {
          Char.fromNat32(c.toNat32() + 32);
        } else { c };
      }
    );

    let isDuplicate = courses.values().find(
      func(c) {
        let courseNameLower = c.name.map(
          func(c) {
            if (c >= 'A' and c <= 'Z') {
              Char.fromNat32(c.toNat32() + 32);
            } else { c };
          }
        );
        let courseYearLower = c.year.map(
          func(c) {
            if (c >= 'A' and c <= 'Z') {
              Char.fromNat32(c.toNat32() + 32);
            } else { c };
          }
        );
        courseNameLower == nameLower and courseYearLower == yearLower
      }
    );

    switch (isDuplicate) {
      case (?_) { Runtime.trap("Course with name/year already exists") };
      case (null) {};
    };

    // Use a stable counter for unique IDs (survives deletes and upgrades)
    let newId = courseIdCounter;
    courseIdCounter += 1;

    let course = {
      id = newId;
      name;
      year;
      createdAt = Time.now();
    };

    courses.add(newId, course);
    newId;
  };

  public query ({ caller }) func getCourse(courseId : Nat) : async ?CourseRecord {
    courses.get(courseId);
  };

  public query ({ caller }) func getAllCourses() : async [CourseRecord] {
    courses.values().toArray();
  };

  // Allow all callers (auth is handled frontend-side)
  public shared ({ caller }) func deleteCourse(courseId : Nat) : async () {
    ignore caller;

    switch (courses.get(courseId)) {
      case (null) { Runtime.trap("Course does not exist") };
      case (?_) {
        courses.remove(courseId);

        // Also remove all associated periods
        let remainingPeriods = periods.toArray().filter(
          func((k, v)) { v.courseId != courseId }
        );

        periods.clear();
        for ((k, v) in remainingPeriods.values()) {
          periods.add(k, v);
        };
      };
    };
  };

  // ----------------------------------------
  // Period Management
  // ----------------------------------------
  public shared ({ caller }) func addPeriod(input : PeriodInput) : async () {
    ignore caller; // Auth is handled frontend-side

    switch (courses.get(input.courseId)) {
      case (null) { Runtime.trap("Course does not exist") };
      case (?_) {
        let period = {
          id = periodIdCounter;
          courseId = input.courseId;
          date = input.date;
          periodNumber = input.periodNumber;
          summaryPrimary = input.summaryPrimary;
          summarySecondary = input.summarySecondary;
          createdAt = Time.now();
        };

        periods.add(periodIdCounter, period);
        periodIdCounter += 1;
      };
    };
  };

  public query ({ caller }) func getPeriodsForDate(courseId : Nat, date : Text) : async [PeriodRecord] {
    let filtered = periods.toArray().filter(
      func((id, period)) { period.courseId == courseId and period.date == date }
    );

    let periodValues = filtered.map(func((id, period)) { period });
    periodValues.sort();
  };
};
