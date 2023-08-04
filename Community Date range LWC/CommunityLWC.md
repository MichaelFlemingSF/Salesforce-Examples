# Customer Community LWC for data capture inside screen flow

A short project I had recently was to assist a recruiting company with improving the way users could enter dated work history details in a customer community. Previously, the was carried out with a loop node and a screen for inputting the details of each job. This approach in flow didn't work in practice as candidates could not see the records they had already entered and the validations to ensure a full work history was present didn't work correctly in numerous scenarios and didn't allow for more complex validations. To resolve this, a new LWC was created to capture the work history information and provide visual indicators if the user has left gaps or entered overlapping histories.

![User interface showing the existing records within a work history input screen](images/User%20Interface%20view.png "User interface within flow")

you can find the LWC for this component within the [workHistoryInput folder](workHistoryInput/)