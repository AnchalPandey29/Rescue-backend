// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VolunteerIncentiveRegistry is Ownable {
    // Struct for Volunteer Profile
    struct VolunteerProfile {
        uint256 totalReportsResolved;       // Total number of reports resolved
        uint256 totalIncentivePoints;       // Accumulated incentive points
        uint256 lastClaimTimestamp;         // Last time incentives were claimed
        bool exists;                        // Flag to check if volunteer exists
    }

    // Struct for Incentive Transaction
    struct IncentiveTransaction {
        uint256 reportId;                   // Report ID associated with the incentive
        uint256 points;                     // Points awarded
        uint256 timestamp;                  // Time of the award
        string role;                        // Role of the volunteer in resolving the report
    }

    // Mappings
    mapping(address => VolunteerProfile) public volunteers;                     // Volunteer address => Profile
    mapping(address => IncentiveTransaction[]) public volunteerHistory;         // Volunteer address => History of incentives
    mapping(uint256 => bool) public rewardedReports;                            // Report ID => Whether it has been rewarded

    // Token contract for rewards (e.g., ERC20 token)
    IERC20 public rewardToken;                                                  // ERC20 token for incentives (optional)
    uint256 public pointsPerResolution = 100;                                   // Points awarded per resolved report
    uint256 public tokenPerPoint = 1e18;                                        // 1 point = 1 token (adjustable, in wei)

    // Events
    event VolunteerRegistered(address indexed volunteer, uint256 timestamp);
    event IncentiveAwarded(
        address indexed volunteer,
        uint256 indexed reportId,
        uint256 points,
        string role,
        uint256 timestamp
    );
    event IncentivesClaimed(
        address indexed volunteer,
        uint256 points,
        uint256 tokenAmount,
        uint256 timestamp
    );
    event PointsPerResolutionUpdated(uint256 newPointsPerResolution, uint256 timestamp);

    // Constructor
    constructor(address _rewardToken) Ownable(msg.sender) {
        rewardToken = IERC20(_rewardToken); // Pass the address of an ERC20 token contract
    }

    // Register a volunteer (optional, can auto-register on first reward)
    function registerVolunteer() public {
        require(!volunteers[msg.sender].exists, "Volunteer already registered");

        volunteers[msg.sender] = VolunteerProfile({
            totalReportsResolved: 0,
            totalIncentivePoints: 0,
            lastClaimTimestamp: 0,
            exists: true
        });

        emit VolunteerRegistered(msg.sender, block.timestamp);
    }

    // Award incentives for resolving a report
    function awardIncentive(address _volunteer, uint256 _reportId, string memory _role) external onlyOwner {
        require(volunteers[_volunteer].exists, "Volunteer not registered");
        require(!rewardedReports[_reportId], "Report already rewarded");
        require(bytes(_role).length > 0, "Role is required");

        // Update volunteer profile
        volunteers[_volunteer].totalReportsResolved += 1;
        volunteers[_volunteer].totalIncentivePoints += pointsPerResolution;

        // Mark report as rewarded
        rewardedReports[_reportId] = true;

        // Record transaction history
        volunteerHistory[_volunteer].push(
            IncentiveTransaction({
                reportId: _reportId,
                points: pointsPerResolution,
                timestamp: block.timestamp,
                role: _role
            })
        );

        emit IncentiveAwarded(_volunteer, _reportId, pointsPerResolution, _role, block.timestamp);
    }

    // Claim accumulated incentives as tokens
    function claimIncentives() public {
        require(volunteers[msg.sender].exists, "Volunteer not registered");
        require(volunteers[msg.sender].totalIncentivePoints > 0, "No incentives to claim");
        require(rewardToken.balanceOf(address(this)) >= volunteers[msg.sender].totalIncentivePoints * tokenPerPoint, "Insufficient token balance in contract");

        uint256 pointsToClaim = volunteers[msg.sender].totalIncentivePoints;
        uint256 tokenAmount = pointsToClaim * tokenPerPoint;

        // Reset points and update timestamp
        volunteers[msg.sender].totalIncentivePoints = 0;
        volunteers[msg.sender].lastClaimTimestamp = block.timestamp;

        // Transfer tokens
        require(rewardToken.transfer(msg.sender, tokenAmount), "Token transfer failed");

        emit IncentivesClaimed(msg.sender, pointsToClaim, tokenAmount, block.timestamp);
    }

    // Update points per resolution (only owner)
    function updatePointsPerResolution(uint256 _newPointsPerResolution) external onlyOwner {
        require(_newPointsPerResolution > 0, "Points must be greater than zero");
        pointsPerResolution = _newPointsPerResolution;

        emit PointsPerResolutionUpdated(_newPointsPerResolution, block.timestamp);
    }

    // Get volunteer profile
    function getVolunteerProfile(address _volunteer)
        public
        view
        returns (
            uint256 totalReportsResolved,
            uint256 totalIncentivePoints,
            uint256 lastClaimTimestamp
        )
    {
        require(volunteers[_volunteer].exists, "Volunteer not registered");
        VolunteerProfile memory profile = volunteers[_volunteer];
        return (
            profile.totalReportsResolved,
            profile.totalIncentivePoints,
            profile.lastClaimTimestamp
        );
    }

    // Get volunteer incentive history
    function getVolunteerHistory(address _volunteer)
        public
        view
        returns (IncentiveTransaction[] memory)
    {
        require(volunteers[_volunteer].exists, "Volunteer not registered");
        return volunteerHistory[_volunteer];
    }

    // Fund the contract with tokens (only owner)
    function fundContract(uint256 _amount) external onlyOwner {
        require(_amount > 0, "Amount must be greater than zero");
        require(rewardToken.transferFrom(msg.sender, address(this), _amount), "Token transfer failed");
    }

    // Withdraw tokens from contract (only owner, emergency use)
    function withdrawTokens(uint256 _amount) external onlyOwner {
        require(_amount > 0, "Amount must be greater than zero");
        require(rewardToken.transfer(msg.sender, _amount), "Token transfer failed");
    }
}