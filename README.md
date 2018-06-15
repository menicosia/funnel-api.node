# Customer Funnel Tracker API

## Install

With no manifest:
```
cf push --no-start
cf create-service p-mysql 100mb funnel # (or whatever instance name you prefer)
cfcf bind-service funnel-api funnel # (or just use the default in the manifest.yml)
cf restart funnel-api
```

... also you can use the included manifest, which expects to auto-bind to a service instance called `funnelDB`.

## Usage

N/A

### API

Write a record
- http://funnel-api.cfapps.io/json/newState?custName=Zombocom&state={AARR}&note=No+news+is+good+news

