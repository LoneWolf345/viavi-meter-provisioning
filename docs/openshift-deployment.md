# OpenShift Deployment

This guide describes how to deploy the VIAVI Meter Provisioning application to an OpenShift cluster and configure the Tekton pipeline.

## Apply Application Manifests

Ensure you are logged in to the target cluster with the `oc` CLI and then apply the application manifests:

```sh
oc apply -f openshift/
```

## Required Environment Variables and Secrets

Create a ConfigMap and Secret to supply runtime configuration and credentials:

```sh
oc create configmap app-config \
  --from-literal=VITE_API_BASE_URL=<api-url> \
  --from-literal=VITE_SUPABASE_URL=<supabase-url> \
  --from-literal=VITE_USE_STUB_API=false

oc create secret generic app-secrets \
  --from-literal=VITE_SUPABASE_ANON_KEY=<anon-key>
```

Update the placeholder values to match your environment. The `VITE_SUPABASE_ANON_KEY` should remain secret.

## Pipeline Resources

Tekton resources automate build and deployment tasks:

```sh
# Persistent volume for the shared workspace
oc apply -f openshift/pipeline/pipeline-pvc.yaml

# Registry credentials and service account
oc apply -f openshift/pipeline/registry-secret.yaml
oc apply -f openshift/pipeline/service-account.yaml

# Pipeline definition and trigger configuration
oc apply -f openshift/pipeline/pipeline.yaml
oc apply -f openshift/pipeline/trigger.yaml
```

Run the pipeline manually with:

```sh
oc create -f openshift/pipeline/pipeline-run.yaml
```

## Configure Route and Webhook Trigger

Expose the application and Tekton EventListener via routes:

```sh
# Application route
oc apply -f openshift/route.yaml

# EventListener route for Git webhooks
oc expose service el-github-listener
```

In your Git hosting service, create a webhook pointing to the EventListener route URL and enable **push** events. When commits are pushed, the webhook calls the EventListener and a new `PipelineRun` is created to build the image and apply the manifests.
