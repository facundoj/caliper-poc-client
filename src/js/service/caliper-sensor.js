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
                return handler(student, event);
            }
        }

        function trackAssessmentEvent(student, event) {
            // Object
            var edApp = new Caliper.Entities.Assessment(event.details.id);
            edApp.setName(event.details.name);

            // Actor
            var actor = new Caliper.Entities.Person(student.id);

            // Generatable
            var attempt;
            switch (event.details.action) {
                case 'STARTED':
                    // Fat / Skinny
                    attempt = new Caliper.Entities.Attempt();
                    attempt.setId(event.details.generated.id);
                    attempt.setCount(event.details.generated.count);
                    attempt.setStartedAtTime(new Date());
                    // Caching attempt
                    student.currentAttempt = attempt;
                    break;

                case 'SUBMITTED':
                    attempt = student.currentAttempt;
                    attempt.setEndedAtTime(new Date());
                    break;
            }

            // Creating Assesment Event
            var assessmentEvent = new Caliper.Events.AssessmentEvent();
            assessmentEvent.setActor(actor);
            assessmentEvent.setAction(Caliper.Actions.AssessmentActions[event.details.action]);
            assessmentEvent.setObject(edApp);
            assessmentEvent.setGenerated(attempt);
            assessmentEvent.setEventTime(new Date());

            // Execute call
            sensor.send(assessmentEvent);
        }

    });
