// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

// Import OpenZeppelin contracts for security
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EventChain
 * @dev A decentralized event ticketing smart contract that supports only native token.
 * Features include:
 * - Event creation and management
 * - Ticket purchasing with native token
 * - Refund functionality
 * - Secure fund handling
 * - Event capacity limits
 */
contract EventChain is ReentrancyGuard, Ownable {
    /// @notice Maximum values for event parameters to prevent abuse
    uint256 public constant MAX_NAME_LENGTH = 100;
    uint256 public constant MAX_URL_LENGTH = 200;
    uint256 public constant MAX_DETAILS_LENGTH = 1000;
    uint256 public constant MAX_LOCATION_LENGTH = 150;
    uint256 public constant MAX_TICKET_PRICE = 1e24;
    uint256 public constant MAX_ATTENDEES = 5000;
    uint256 public constant MIN_EVENT_DURATION = 1 hours;
    uint256 public constant REFUND_BUFFER = 5 hours;

    /// @notice Contract pause status - emergency stop mechanism
    bool public paused;

    /// @notice Structure to store comprehensive event details
    struct Event {
        address owner;
        string eventName;
        string eventCardImgUrl;
        string eventDetails;
        uint64 startDate;
        uint64 endDate;
        uint64 startTime;
        uint64 endTime;
        string eventLocation;
        bool isActive;
        uint256 ticketPrice;
        uint256 fundsHeld;
        uint256 minimumAge;
        bool isCanceled;
        bool fundsReleased;
        bool exists;
    }

    /// @notice Mapping of event ID to Event struct
    mapping(uint256 => Event) public events;

    /// @notice Counter to track total number of events created
    uint256 public eventCount;

    /// @notice Mapping of event ID to attendee address to attendance status
    mapping(uint256 => mapping(address => bool)) public isAttendee;

    /// @notice Mapping of event ID to list of attendee addresses
    mapping(uint256 => address[]) internal eventAttendeesList;

    /// @notice Mapping of event ID to attendee count
    mapping(uint256 => uint256) public attendeeCount;

    /// @notice Mapping of creator address to their event IDs
    mapping(address => uint256[]) internal creatorEventIds;

    /// @notice Mapping to track if a user has purchased a ticket for an event
    mapping(uint256 => mapping(address => bool)) public hasPurchasedTicket;

    /// @notice Event emitted when a new event is created
    event EventCreated(
        uint256 indexed eventId,
        address indexed owner,
        string eventName
    );

    /// @notice Event emitted when an event is updated
    event EventUpdated(
        uint256 indexed eventId,
        address indexed owner,
        string eventName
    );

    /// @notice Event emitted when a ticket is purchased
    event TicketPurchased(
        uint256 indexed eventId,
        address indexed buyer,
        uint256 amount
    );

    /// @notice Event emitted when an event is canceled
    event EventCanceled(uint256 indexed eventId);

    /// @notice Event emitted when a refund is issued
    event RefundIssued(
        uint256 indexed eventId,
        address indexed user,
        uint256 amount
    );

    /// @notice Event emitted when funds are released to the event owner
    event FundsReleased(uint256 indexed eventId, uint256 amount);
    event Refunded(address indexed user, uint256 amount);

    /// @dev Modifier to check if the caller is the owner of the event
    modifier onlyEventOwner(uint256 _index) {
        require(events[_index].owner == msg.sender, "Not event owner");
        _;
    }

    /// @dev Modifier to validate event exists and is active
    modifier validEvent(uint256 _index) {
        require(events[_index].exists, "Event doesn't exist");
        require(events[_index].owner != address(0), "Event owner is zero");
        _;
    }

    /// @dev Modifier to check if contract is not paused
    modifier whenNotPaused() {
        require(!paused, "Contract paused");
        _;
    }

    constructor() Ownable(msg.sender) {
        // Contract owner is set to deployer
    }

    receive() external payable {} // Accept token natively

    /**
     * @notice Toggle pause state of the contract (only owner)
     * @dev Emergency stop mechanism
     */
    function togglePause() external onlyOwner {
        paused = !paused;
    }

    /**
     * @notice Create a new event with comprehensive details
     * @dev Creates a new event with all necessary parameters and performs validation
     * @param _eventName The name of the event (1-100 chars)
     * @param _eventCardImgUrl Image URL for event display (1-200 chars)
     * @param _eventDetails Description of the event (1-1000 chars)
     * @param _startDate Start date of the event (timestamp)
     * @param _endDate End date of the event (timestamp)
     * @param _startTime Daily start time of the event
     * @param _endTime Daily end time of the event
     * @param _eventLocation Physical or virtual location (1-150 chars)
     * @param _ticketPrice Price of one ticket in Mantle (wei) (0 < price <= MAX_TICKET_PRICE)
     * @param _minimumAge Minimum age requirement for attendees
     */
    function createEvent(
        string calldata _eventName,
        string calldata _eventCardImgUrl,
        string calldata _eventDetails,
        uint64 _startDate,
        uint64 _endDate,
        uint64 _startTime,
        uint64 _endTime,
        string calldata _eventLocation,
        uint256 _ticketPrice,
        uint256 _minimumAge
    ) public whenNotPaused {
        // Input validation
        require(
            bytes(_eventName).length > 0 &&
                bytes(_eventName).length <= MAX_NAME_LENGTH,
            "Invalid name"
        );
        require(
            bytes(_eventCardImgUrl).length > 0 &&
                bytes(_eventCardImgUrl).length <= MAX_URL_LENGTH,
            "Invalid URL"
        );
        require(
            bytes(_eventDetails).length > 0 &&
                bytes(_eventDetails).length <= MAX_DETAILS_LENGTH,
            "Invalid details"
        );
        require(
            bytes(_eventLocation).length > 0 &&
                bytes(_eventLocation).length <= MAX_LOCATION_LENGTH,
            "Invalid location"
        );
        require(
            _ticketPrice > 0 && _ticketPrice <= MAX_TICKET_PRICE,
            "Invalid price"
        );
        require(_startDate >= block.timestamp, "Start date must be future");
        require(
            _endDate >= _startDate + MIN_EVENT_DURATION,
            "Duration too short"
        );

        // Get the next event ID
        uint256 newEventId = eventCount;

        // Create new event struct in mapping
        events[newEventId] = Event({
            owner: msg.sender,
            eventName: _eventName,
            eventCardImgUrl: _eventCardImgUrl,
            eventDetails: _eventDetails,
            startDate: _startDate,
            endDate: _endDate,
            startTime: _startTime,
            endTime: _endTime,
            eventLocation: _eventLocation,
            ticketPrice: _ticketPrice,
            isActive: true,
            fundsHeld: 0,
            isCanceled: false,
            minimumAge: _minimumAge,
            fundsReleased: false,
            exists: true
        });

        // Add event ID to creator's event list
        creatorEventIds[msg.sender].push(newEventId);

        // Increment event counter
        eventCount++;

        emit EventCreated(newEventId, msg.sender, _eventName);
    }

    /**
     * @notice Purchase a ticket for a specific event
     * @dev Handles ticket purchase with native token and prevents double purchases
     * @param _index The ID of the event to purchase a ticket for
     */
    function buyTicket(
        uint256 _index
    ) public payable nonReentrant validEvent(_index) whenNotPaused {
        Event storage event_ = events[_index];

        require(event_.startDate > block.timestamp, "Event expired");
        require(event_.isActive, "Event inactive");
        require(!hasPurchasedTicket[_index][msg.sender], "Already purchased");
        require(attendeeCount[_index] < MAX_ATTENDEES, "Event at capacity");
        require(msg.value == event_.ticketPrice, "Incorrect token amount");

        // Update purchase status and attendee tracking
        hasPurchasedTicket[_index][msg.sender] = true;
        isAttendee[_index][msg.sender] = true;
        eventAttendeesList[_index].push(msg.sender);
        attendeeCount[_index]++;

        // Track funds held for this event
        event_.fundsHeld += msg.value;

        emit TicketPurchased(_index, msg.sender, msg.value);
    }

    /**
     * @notice Cancel an event (only callable by event owner)
     * @dev Marks event as canceled and inactive
     * @param _index The ID of the event to cancel
     */
    function cancelEvent(
        uint256 _index
    ) public onlyEventOwner(_index) validEvent(_index) whenNotPaused {
        require(events[_index].isActive, "Already canceled");

        events[_index].isActive = false;
        events[_index].isCanceled = true;

        emit EventCanceled(_index);
    }

    /**
     * @notice Request a refund for a ticket
     * @dev Allows refunds for canceled events or before refund buffer period
     * @param _index The ID of the event to request refund for
     */
    function requestRefund(
        uint256 _index
    ) public nonReentrant validEvent(_index) whenNotPaused {
        require(hasPurchasedTicket[_index][msg.sender], "No ticket purchased");

        uint256 refundAmount = events[_index].ticketPrice;

        // Check available funds
        require(events[_index].fundsHeld >= refundAmount, "Insufficient funds");

        if (!events[_index].isCanceled) {
            require(
                block.timestamp < events[_index].startDate - REFUND_BUFFER,
                "Refund period ended"
            );
        }

        // Process refund
        hasPurchasedTicket[_index][msg.sender] = false;
        isAttendee[_index][msg.sender] = false;
        events[_index].fundsHeld -= refundAmount;
        attendeeCount[_index]--;

        // Remove from attendees list
        address[] storage attendees = eventAttendeesList[_index];
        for (uint256 i = 0; i < attendees.length; i++) {
            if (attendees[i] == msg.sender) {
                attendees[i] = attendees[attendees.length - 1];
                attendees.pop();
                break;
            }
        }

        // Send token refund
        (bool success, ) = msg.sender.call{value: refundAmount}("");
        require(success, "token refund failed");

        emit RefundIssued(_index, msg.sender, refundAmount);
    }

    /**
     * @notice Release collected funds to event owner after event ends
     * @dev Transfers held funds to event owner and marks funds as released
     * @param _index The ID of the event to release funds for
     */
    function releaseFunds(
        uint256 _index
    ) public onlyEventOwner(_index) nonReentrant {
        require(events[_index].exists, "Invalid event ID");
        require(
            block.timestamp > events[_index].endDate,
            "Event has not ended yet"
        );
        require(
            !events[_index].isCanceled,
            "Cannot release funds for canceled event"
        );
        require(!events[_index].fundsReleased, "Funds already released");

        uint256 amountToRelease = events[_index].fundsHeld;
        require(amountToRelease > 0, "No funds to release");

        events[_index].fundsHeld = 0;
        events[_index].fundsReleased = true;

        // Send token to event owner
        (bool success, ) = msg.sender.call{value: amountToRelease}("");
        require(success, "token transfer failed");

        emit FundsReleased(_index, amountToRelease);
    }

    // View functions for accessing event data

    /**
     * @notice Get comprehensive event details by ID
     * @param _index The event ID to query
     * @return Event details and attendees list
     */
    function getEventById(
        uint256 _index
    ) public view returns (Event memory, address[] memory) {
        require(events[_index].exists, "Event does not exist");
        return (events[_index], eventAttendeesList[_index]);
    }

    /**
     * @notice Get attendees list for an event
     * @param _index The event ID to query
     * @return Array of attendee addresses
     */
    function getAttendees(
        uint256 _index
    ) public view returns (address[] memory) {
        require(events[_index].exists, "Invalid event ID");
        return eventAttendeesList[_index];
    }

    /**
     * @notice Get total number of created events
     * @return Count of all events
     */
    function getEventLength() public view returns (uint256) {
        return eventCount;
    }

    /**
     * @notice Get all event IDs created by a specific creator.
     * @param _creator The address of the event creator.
     * @return An array of event IDs created by the given address.
     */
    function getEventIdsByCreator(
        address _creator
    ) public view returns (uint256[] memory) {
        return creatorEventIds[_creator];
    }

    /**
     * @notice Get all events created by a specific creator.
     * @param _creator The address of the event creator.
     * @return An array of events created by the given address.
     */
    function getEventsByCreator(
        address _creator
    ) public view returns (Event[] memory) {
        uint256[] memory eventIds = creatorEventIds[_creator];
        Event[] memory creatorEvents = new Event[](eventIds.length);

        for (uint256 i = 0; i < eventIds.length; i++) {
            creatorEvents[i] = events[eventIds[i]];
        }

        return creatorEvents;
    }

    /**
     * @notice Get all active events.
     * @return An array of event IDs and corresponding active event details.
     */
    function getAllEvents()
        public
        view
        returns (uint256[] memory, Event[] memory)
    {
        uint count = 0;
        for (uint i = 0; i < eventCount; i++) {
            if (events[i].exists && events[i].isActive) {
                count++;
            }
        }

        uint256[] memory indexes = new uint256[](count);
        Event[] memory activeEvents = new Event[](count);
        uint j = 0;
        for (uint i = 0; i < eventCount; i++) {
            if (events[i].exists && events[i].isActive) {
                indexes[j] = i;
                activeEvents[j] = events[i];
                j++;
            }
        }
        return (indexes, activeEvents);
    }

    /**
     * @notice Get events that the caller has purchased tickets for.
     * @return An array of event IDs and corresponding event details.
     */
    function getUserEvents()
        public
        view
        returns (uint256[] memory, Event[] memory)
    {
        uint count = 0;

        // Count the number of events the user has purchased a ticket for
        for (uint i = 0; i < eventCount; i++) {
            if (events[i].exists && hasPurchasedTicket[i][msg.sender]) {
                count++;
            }
        }

        // Create arrays with the correct size
        uint256[] memory eventIds = new uint256[](count);
        Event[] memory userEvents = new Event[](count);
        uint j = 0;

        // Populate the arrays with the user's events
        for (uint i = 0; i < eventCount; i++) {
            if (events[i].exists && hasPurchasedTicket[i][msg.sender]) {
                eventIds[j] = i;
                userEvents[j] = events[i];
                j++;
            }
        }

        return (eventIds, userEvents);
    }

    /**
     * @notice Get all active events created by the caller.
     * @return An array of event IDs and corresponding active event details.
     */
    function getActiveEventsByCreator()
        public
        view
        returns (uint256[] memory, Event[] memory)
    {
        uint count = 0;
        for (uint i = 0; i < eventCount; i++) {
            if (
                events[i].exists &&
                events[i].owner == msg.sender &&
                events[i].isActive
            ) {
                count++;
            }
        }

        uint256[] memory eventIds = new uint256[](count);
        Event[] memory activeEvents = new Event[](count);
        uint j = 0;
        for (uint i = 0; i < eventCount; i++) {
            if (
                events[i].exists &&
                events[i].owner == msg.sender &&
                events[i].isActive
            ) {
                eventIds[j] = i;
                activeEvents[j] = events[i];
                j++;
            }
        }
        return (eventIds, activeEvents);
    }
}
