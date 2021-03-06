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

        function loadEvents(student, feed) {
            student.loadEvents(JSON.parse(feed));
        }

        function startEvents(student) {
            if (student.hasStarted) return;
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
                }, 100);
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
    this.cache = Object.create(null);
}

Student.prototype.loadEvents = function (events) {
    var self = this;

    self.events = [];
    self.eventsRegistry = {};

    events.forEach(function (eventData) {
        self.events.push(new Event(eventData));
    });

    self.isReady = true;
};

Student.prototype.executeEvent = function(i, caliperSensor) {
    console.log('Executing:', this, this.events[i]);
    // Caliper Sensor - Event tracking
    var generated = caliperSensor.track(this, this.events[i]);
    this.events[i].isCompleted = true;
};

// Event
function Event(data) {
    if (!this instanceof Event) {
        return new Event(data);
    }

    var self = this;

    switch (data.type) {
        case 'AssessmentEvent':
            self.type = 'AssessmentEvent';
            self.details = data.values;

            self.getInfo = self.getAssessmentEventInfo;
            break;

        case 'AssessmentItemEvent':
            self.type = 'AssessmentItemEvent';
            self.details = data.values;

            self.getInfo = self.getAssessmentItemEventInfo;
            break;
        
        case 'AssessmentOutcomeEvent':
            self.type = 'AssessmentOutcomeEvent';
            self.details = data.values;

            self.getInfo = self.getAssessmentOutcomeEventInfo;
            break;

        case 'AssessmentItemOutcomeEvent':
            self.type = 'AssessmentItemOutcomeEvent';
            self.details = data.values;

            self.getInfo = self.getAssessmentItemOutcomeEventInfo;
            break;
    }

    self.isCompleted = false;
}

Event.prototype.getAssessmentEventInfo = function() {
    return 'AssessmentEvent (' +
        'Action: ' + this.details.action + ' - ' +
        'Assesment: ' + this.details.object.id + ' - ' +
        'Attempt: ' + this.details.generated.id +
        ')';
};

Event.prototype.getAssessmentItemEventInfo = function() {
    return 'AssessmentItemEvent (' +
        'Action: ' + this.details.action + ' - ' +
        'Response: ' + this.details.generated.type +
    ')';
};

Event.prototype.getAssessmentOutcomeEventInfo = function() {
    return 'OutcomeEvent (' +
        'Assessment: ' + this.details.assessment.id + ' - ' +
        'Student: ' + this.details.actor.id + ' - ' +
        'Score: ' + this.details.generated.normalScore + '/' + this.details.generated.totalScore +
    ')';
};

Event.prototype.getAssessmentItemOutcomeEventInfo = function() {
    return 'OutcomeEvent (' +
        'Learning Objectives: ' + JSON.stringify(this.details.target.learningObjectives) + ' - ' +
        'Student: ' + this.details.actor.id + ' - ' +
        'Score: ' + this.details.generated.normalScore + '/' + this.details.generated.totalScore +
    ')';
};
