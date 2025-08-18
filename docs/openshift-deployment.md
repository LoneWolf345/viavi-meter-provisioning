# OpenShift Deployment

This guide describes how to deploy the VIAVI Meter Provisioning application to an OpenShift cluster.

## Apply Application Manifests

Ensure you are logged in to the target cluster with the `oc` CLI.

```sh
# Deploy service, route, network policy and deployment
oc apply -f openshift/
```

## Environment Configuration

The deployment expects configuration values and secrets to be supplied via a ConfigMap and Secret.  Create them before applying the manifests:

```sh
oc create configmap app-config \
  --from-literal=VITE_SUPABASE_URL=<supabase-url>

oc create secret generic app-secrets \
  --from-literal=VITE_SUPABASE_ANON_KEY=<anon-key>
```

Update the values to match your environment.

## Pipeline and Trigger Setup

Tekton resources are provided to automate builds and deployments.

```sh
# Persistent volume for the workspace
oc apply -f openshift/pipeline/pipeline-pvc.yaml

# Pipeline definition and trigger configuration
oc apply -f openshift/pipeline/pipeline.yaml
oc apply -f openshift/pipeline/trigger.yaml
```

Create a PipelineRun to execute the pipeline:

```sh
oc create -f openshift/pipeline/pipeline-run.yaml
```

The pipeline clones the repository, installs dependencies, lints, tests, builds a container image, and applies the OpenShift manifests. When a run completes successfully, a new image is pushed to the internal registry and the application is redeployed.
