'use strict';

angular
    .module('pocApp')
    .factory('StudentManager', function($http, $timeout, caliperSensor) {
        // Debugging purpose
        var counter = 0;

        // Public interface
        return {
            create: create,
            loadEvents: loadEvents,
            startEvents: startEvents
        };

        // Functions ***********************************************************

        function create() {
            console.log('Creating student');
            return new Student();
        }

        function loadEvents(student, file) {
            console.log('Loading events:', student, file);
            $http
                .get('resources/' + file)
                .then(function success(res) {
                    student.loadEvents(res.data);
                });
        }

        function startEvents(student) {
            console.log('Starting events for:', student);
            student.hasStarted = true;
            triggerNextEvent(student, 0);
        }

        // Recursively triggers each events, after waiting a random amount of time
        function triggerNextEvent(student, i) {
            if (i < student.events.length) {
                $timeout(function() {
                    // Debugging purpose
                    counter++;

                    student.executeEvent(i, caliperSensor);
                    student.events[i].order = counter;
                    triggerNextEvent(student, i + 1)
                }, Math.ceil(Math.random() * 10000 + 1000));
            }
        }
    });

// Objects definitions *********************************************************

// Student
function Student() {
    if (!this instanceof Student) {
        return new Student();
    }

    this.isReady = false;
    this.hasStarted = false;
}

Student.prototype.loadEvents = function (events) {
    var self = this,
        // Events separated by "--"
        eventsArray = events.trim().split('--');

    self.events = []

    eventsArray.forEach(function(eventData) {
        self.events.push(new Event(eventData.trim()));
    });

    self.isReady = true;
};

Student.prototype.executeEvent = function(i, caliperSensor) {
    console.log('Executing:', this, this.events[i]);
    // Caliper Sensor - Event tracking
    caliperSensor.track(this, this.events[i]);
    this.events[i].isCompleted = true;
};

// Event
function Event(data) {
    if (!this instanceof Event) {
        return new Event(data);
    }

    var dataArray = data.trim().split('\n'),
        eventDetails,
        self = this;

    switch (dataArray[0]) {
        case 'AssessmentEvent':
            /**
             * Event structure:
             * AssessmentEvent
             * {{softwareApplication}};{{name}}
             */
            eventDetails = dataArray[1].trim().split(';');

            self.type = 'AssessmentEvent';
            self.softwareApplication = eventDetails[0].trim();
            self.name = eventDetails[1].trim();

            self.getInfo = self.getAssessmentEventInfo;
            break;
    }

    self.isCompleted = false;
}

Event.prototype.getAssessmentEventInfo = function() {
    return 'AssessmentEvent (' +
        'Name: ' + this.name + ' ' +
        'Application: ' + this.softwareApplication +
        ')';
}
