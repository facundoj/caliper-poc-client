'use strict';

angular
    .module('pocApp')
    .factory('caliperSensor', function() {
        var sensor = Caliper.Sensor,
            // Sensor mapper
            trackingMap = {
                'AssessmentEvent': trackAssessmentEvent,
                'AssessmentItemEvent': trackAssessmentItemEvent,
                'OutcomeEvent': trackOutcomeEvent
            };

        // Pointing to Event Store
        sensor.initialize('POC-Sensor', {
            host: 'localhost', //'10.132.11.78',
            port: '8888', //'3001',
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
            var object = new Caliper.Entities.Assessment(event.details.object.id);
            object.setName(event.details.object.name);
            object.setVersion(event.details.object.version);

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
                    attempt.setAssignable(object);
                    attempt.setActor(actor);
                    // Caching attempt
                    student.currentAttempt = attempt;
                    break;

                case 'SUBMITTED':
                    attempt = student.currentAttempt;
                    attempt.setEndedAtTime(new Date());
                    break;
            }
            student.cache[event.details.generated.id] = attempt;
            student.cache[event.details.object.id] = object;

            // Creating Assesment Event
            var assessmentEvent = new Caliper.Events.AssessmentEvent();
            assessmentEvent.setActor(actor);
            assessmentEvent.setAction(Caliper.Actions.AssessmentActions[event.details.action]);
            assessmentEvent.setObject(object);
            assessmentEvent.setGenerated(attempt);
            assessmentEvent.setEventTime(new Date());

            // Execute call
            sensor.send(assessmentEvent);
        }

        function trackAssessmentItemEvent(student, event) {
            // Actor
            var actor = new Caliper.Entities.Person(student.id);

            // Object
            var object = new Caliper.Entities.AssessmentItem(event.details.object.id);
            student.cache[event.details.object.id] = object;

            // Parent Assessment
            object.setIsPartOf(student.cache[event.details.isPartOf.id]);

            // Learning Objectives
            var learningObjectives = [];
            event.details.learningObjective.forEach(function(lo) {
                learningObjectives.push(new Caliper.Entities.LearningObjective(lo.id));
            });
            object.setAlignedLearningObjective(learningObjectives);

            // Generatable
            var generated = new Caliper.Entities.Response(event.details.generated.id);
            generated.setActor(actor);
            generated.setAssignable(object);
            generated.setType(Caliper.Entities.ResponseType[event.details.generated.type]);
            generated.setAttempt(student.currentAttempt);
            generated.setStartedAtTime(new Date());
            generated.setEndedAtTime(new Date());
            generated.setDuration(100);

            // Event
            var assessmentItemEvent = new Caliper.Events.AssessmentItemEvent();
            assessmentItemEvent.setAction(Caliper.Actions.AssessmentItemActions[event.details.action]);
            assessmentItemEvent.setActor(actor);
            assessmentItemEvent.setObject(object);
            assessmentItemEvent.setGenerated(generated);
            assessmentItemEvent.setEventTime(new Date());

            sensor.send(assessmentItemEvent);
        }

        function trackOutcomeEvent(student, event) {
            // Actor
            var actor = new Caliper.Entities.Person(student.id);

            // Generatable
            var generated = new Caliper.Entities.Result(event.details.generated.id);
            generated.setNormalScore(event.details.generated.normalScore);
            generated.setTotalScore(event.details.generated.setTotalScore);
            generated.setActor(actor);

            // Event
            var outcomeEvent = new Caliper.Events.OutcomeEvent();
            outcomeEvent.setObject(student.cache[event.details.object.id]);
            outcomeEvent.setActor(actor);
            outcomeEvent.setAction(Caliper.Actions.OutcomeActions[event.details.action]);
            outcomeEvent.setGenerated(generated);
            outcomeEvent.setEventTime(new Date());


            if (student.cache[event.details.target.id]) {
                generated.setAssignable(student.cache[event.details.target.id]);
                outcomeEvent.setTarget(student.cache[event.details.target.id]);
            }

            student.currentAttempt = null;

            sensor.send(outcomeEvent);
        }

    });
