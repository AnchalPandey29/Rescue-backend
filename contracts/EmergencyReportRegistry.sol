// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EmergencyReportRegistry {
    // Enum for report status
    enum ReportStatus { Open, InProgress, Resolved }

    // Struct for Emergency Report
    struct EmergencyReport {
        uint256 reportId;           // Unique ID for the report
        string disasterType;        // Type of disaster (e.g., Fire, Flood)
        string description;         // Description of the emergency
        string location;            // Location (stored as string, e.g., "Lat: x, Lng: y" or address)
        uint256 timestamp;          // Time of report submission
        string severity;            // Severity level (e.g., Critical, High)
        string[] tags;              // Tags for categorization
        string[] mediaUrls;         // URLs of uploaded media (stored off-chain)
        address reporter;           // Address of the person reporting
        ReportStatus status;        // Current status of the report
        bool exists;                // Flag to check if report exists
    }

    // Struct for Volunteer Assignment
    struct VolunteerAssignment {
        address volunteer;          // Address of the volunteer
        uint256 assignmentTimestamp;// Time when volunteer was assigned
        string role;                // Role of volunteer (e.g., "Firefighter", "Medical Aid")
    }

    // Struct for History Entry
    struct HistoryEntry {
        uint256 timestamp;          // Time of the update
        string action;              // Action taken (e.g., "Assigned Volunteer", "Resolved")
        address actor;              // Address of the person who performed the action
        string details;             // Additional details about the action
    }

    // Mappings and counters
    mapping(uint256 => EmergencyReport) public reports;                     // Report ID => Emergency Report
    mapping(uint256 => VolunteerAssignment[]) public reportVolunteers;      // Report ID => List of Volunteers
    mapping(uint256 => HistoryEntry[]) public reportHistory;               // Report ID => History Entries
    uint256 public reportCount;                                            // Total number of reports

    // Events
    event NewReport(
        uint256 indexed reportId,
        string disasterType,
        string location,
        uint256 timestamp,
        address indexed reporter
    );
    event VolunteerAssigned(
        uint256 indexed reportId,
        address indexed volunteer,
        string role,
        uint256 timestamp
    );
    event ReportStatusUpdated(
        uint256 indexed reportId,
        ReportStatus status,
        uint256 timestamp,
        address indexed updater
    );
    event HistoryUpdated(
        uint256 indexed reportId,
        string action,
        string details,
        uint256 timestamp,
        address indexed actor
    );

    // Constructor
    constructor() {
        reportCount = 0;
    }

    // Submit a new emergency report
    function submitReport(
        string memory _disasterType,
        string memory _description,
        string memory _location,
        string memory _severity,
        string[] memory _tags,
        string[] memory _mediaUrls
    ) public returns (uint256) {
        require(bytes(_disasterType).length > 0, "Disaster type is required");
        require(bytes(_description).length > 0, "Description is required");
        require(bytes(_location).length > 0, "Location is required");
        require(bytes(_severity).length > 0, "Severity is required");

        reportCount += 1;
        reports[reportCount] = EmergencyReport({
            reportId: reportCount,
            disasterType: _disasterType,
            description: _description,
            location: _location,
            timestamp: block.timestamp,
            severity: _severity,
            tags: _tags,
            mediaUrls: _mediaUrls,
            reporter: msg.sender,
            status: ReportStatus.Open,
            exists: true
        });

        // Add initial history entry
        reportHistory[reportCount].push(
            HistoryEntry({
                timestamp: block.timestamp,
                action: "Report Submitted",
                actor: msg.sender,
                details: "Emergency report created"
            })
        );

        emit NewReport(reportCount, _disasterType, _location, block.timestamp, msg.sender);
        emit HistoryUpdated(reportCount, "Report Submitted", "Emergency report created", block.timestamp, msg.sender);

        return reportCount;
    }

    // Assign a volunteer to a report
    function assignVolunteer(uint256 _reportId, string memory _role) public {
        require(reports[_reportId].exists, "Report does not exist");
        require(reports[_reportId].status != ReportStatus.Resolved, "Report is already resolved");
        require(bytes(_role).length > 0, "Role is required");

        reportVolunteers[_reportId].push(
            VolunteerAssignment({
                volunteer: msg.sender,
                assignmentTimestamp: block.timestamp,
                role: _role
            })
        );

        // Update status to InProgress if it was Open
        if (reports[_reportId].status == ReportStatus.Open) {
            reports[_reportId].status = ReportStatus.InProgress;
            emit ReportStatusUpdated(_reportId, ReportStatus.InProgress, block.timestamp, msg.sender);
        }

        // Add history entry
        reportHistory[_reportId].push(
            HistoryEntry({
                timestamp: block.timestamp,
                action: "Volunteer Assigned",
                actor: msg.sender,
                details: string(abi.encodePacked("Role: ", _role))
            })
        );

        emit VolunteerAssigned(_reportId, msg.sender, _role, block.timestamp);
        emit HistoryUpdated(_reportId, "Volunteer Assigned", string(abi.encodePacked("Role: ", _role)), block.timestamp, msg.sender);
    }

    // Resolve a report (only reporter or volunteer can resolve)
    function resolveReport(uint256 _reportId, string memory _resolutionDetails) public {
        require(reports[_reportId].exists, "Report does not exist");
        require(reports[_reportId].status != ReportStatus.Resolved, "Report is already resolved");
        bool isAuthorized = reports[_reportId].reporter == msg.sender;
        for (uint256 i = 0; i < reportVolunteers[_reportId].length; i++) {
            if (reportVolunteers[_reportId][i].volunteer == msg.sender) {
                isAuthorized = true;
                break;
            }
        }
        require(isAuthorized, "Only reporter or assigned volunteer can resolve");

        reports[_reportId].status = ReportStatus.Resolved;

        // Add history entry
        reportHistory[_reportId].push(
            HistoryEntry({
                timestamp: block.timestamp,
                action: "Report Resolved",
                actor: msg.sender,
                details: _resolutionDetails
            })
        );

        emit ReportStatusUpdated(_reportId, ReportStatus.Resolved, block.timestamp, msg.sender);
        emit HistoryUpdated(_reportId, "Report Resolved", _resolutionDetails, block.timestamp, msg.sender);
    }

    // Get report details
    function getReport(uint256 _reportId)
        public
        view
        returns (
            uint256 reportId,
            string memory disasterType,
            string memory description,
            string memory location,
            uint256 timestamp,
            string memory severity,
            string[] memory tags,
            string[] memory mediaUrls,
            address reporter,
            ReportStatus status
        )
    {
        require(reports[_reportId].exists, "Report does not exist");
        EmergencyReport memory report = reports[_reportId];
        return (
            report.reportId,
            report.disasterType,
            report.description,
            report.location,
            report.timestamp,
            report.severity,
            report.tags,
            report.mediaUrls,
            report.reporter,
            report.status
        );
    }

    // Get volunteers for a report
    function getVolunteers(uint256 _reportId)
        public
        view
        returns (VolunteerAssignment[] memory)
    {
        require(reports[_reportId].exists, "Report does not exist");
        return reportVolunteers[_reportId];
    }

    // Get history for a report
    function getHistory(uint256 _reportId)
        public
        view
        returns (HistoryEntry[] memory)
    {
        require(reports[_reportId].exists, "Report does not exist");
        return reportHistory[_reportId];
    }

    // Get total number of reports
    function getTotalReports() public view returns (uint256) {
        return reportCount;
    }
}