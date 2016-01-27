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
            host: '10.55.18.80',
            port: '3001',
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
            var generated = new Caliper.Entities.Response('response-' + event.details.object.id + '-' + Date.now());
            generated.setActor(actor);
            generated.setAssignable(object);
            generated.setType(Caliper.Entities.ResponseType[event.details.generated.type]);
            generated.setAttempt(student.currentAttempt);
            var startTime = new Date();
            generated.setStartedAtTime(startTime);
            generated.setEndedAtTime(new Date(startTime.getTime() + 1000));
            generated.setDuration(1000);

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
            var actor = new Caliper.Entities.Person(event.details.actor.id);

            // Generatable
            var generated = new Caliper.Entities.Result('result-' + event.details.object.id + '-' + Date.now());
            generated.setNormalScore(event.details.generated.normalScore);
            generated.setTotalScore(event.details.generated.totalScore);
            generated.setActor(actor);

            // Object - Attempt
            var assessment = new Caliper.Entities.Assessment(event.details.assessment.id);
            assessment.setVersion(event.details.assessment.version);

            var attempt = new Caliper.Entities.Attempt();
            attempt.setId(event.details.object.id);
            attempt.setCount(event.details.object.count);
            attempt.setStartedAtTime(new Date());
            attempt.setEndedAtTime(new Date());
            attempt.setAssignable(assessment);
            attempt.setActor(actor);

            // Event
            var outcomeEvent = new Caliper.Events.OutcomeEvent();
            outcomeEvent.setObject(attempt); // Attempt
            outcomeEvent.setActor(actor);
            outcomeEvent.setAction(Caliper.Actions.OutcomeActions[event.details.action]);
            outcomeEvent.setGenerated(generated);
            outcomeEvent.setEventTime(new Date());

            // Assessment Item
            var item = new Caliper.Entities.AssessmentItem(event.details.target.id);

            // Learning Objectives
            var learningObjectives = [];
            event.details.target.learningObjective.forEach(function(lo) {
                learningObjectives.push(new Caliper.Entities.LearningObjective(lo.id));
            });
            item.setAlignedLearningObjective(learningObjectives);

            generated.setAssignable(item);
            outcomeEvent.setTarget(item);

            sensor.send(outcomeEvent);
        }
    });
