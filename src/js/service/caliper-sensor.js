'use strict';

angular
    .module('pocApp')
    .factory('caliperSensor', function() {
        var sensor = Caliper.Sensor,
            // Sensor mapper
            trackingMap = {
                'AssessmentEvent': trackAssessmentEvent
            };

        // Pointing to Event Store
        sensor.initialize('POC-Sensor', {
            host: '127.0.0.1',
            port: '8888',
            path: '/message',
            withCredentials: false
        });

        // Public interface
        return {
            track: track
        };

        // Functions ***********************************************************

        // Facade for events tracking
        function track(student, event) {
            var handler = trackingMap[event.type];
            console.log('Tracking:', event);

            if (handler instanceof Function) {
                // Delagating tracking to particular events
                handler(student, event);
            }
        }

        function trackAssessmentEvent(student, event) {
            // Current app
            var edApp = new Caliper.Entities.SoftwareApplication(event.softwareApplication);
            edApp.setName(event.name);

            // Student actor
            var student = new Caliper.Entities.Person('storage/student/' + student.id);

            // Creating Assesment Event
            var assessmentEvent = new Caliper.Events.AssessmentEvent();
            assessmentEvent.setActor(student);
            assessmentEvent.setAction(Caliper.Actions.AssessmentActions.STARTED);
            assessmentEvent.setObject(edApp);
            assessmentEvent.setEventTime(new Date());

            // Execute call
            sensor.send(assessmentEvent);
        }

    });
