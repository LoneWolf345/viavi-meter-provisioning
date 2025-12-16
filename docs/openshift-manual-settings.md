# OpenShift Manual Settings Checklist

This document provides a comprehensive checklist of all manual configurations required for deploying the VIAVI Meter Provisioning application to OpenShift.

---

## Pre-Deployment Checklist

Before deploying, ensure the following prerequisites are met:

- [ ] OpenShift cluster access verified (`oc whoami` returns your username)
- [ ] Tekton Pipelines 1.17.0+ installed on cluster
- [ ] Target namespace created (`oc new-project viavi-meter-provisioning` or similar)
- [ ] Image registry access configured (internal or external)
- [ ] Permissions to create Deployments, Services, Routes, ConfigMaps, Secrets

---

## Environment-Specific Values

### ConfigMap (`app-config`)

Create or update the ConfigMap with environment-specific values:

```bash
oc create configmap app-config \
  --from-literal=VITE_API_BASE_URL=<your-api-url> \
  --from-literal=VITE_USE_STUB_API=false \
  --from-literal=VITE_SUPABASE_URL=<your-supabase-url>
```

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `VITE_API_BASE_URL` | Provisioning API endpoint | `https://ldap-api.apps.prod-ocp4.corp.cableone.net/` |
| `VITE_USE_STUB_API` | Use mock API (always `false` in production) | `false` |
| `VITE_SUPABASE_URL` | Supabase project URL | `https://lombpdlxtsxvrmionlfv.supabase.co` |

### Secret (`app-secrets`)

Create the Secret with sensitive values (never commit to version control):

```bash
oc create secret generic app-secrets \
  --from-literal=VITE_SUPABASE_ANON_KEY=<your-actual-anon-key>
```

| Variable | Description | How to Obtain |
|----------|-------------|---------------|
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key | Supabase Dashboard → Settings → API → `anon` `public` key |

---

## Security Context Requirements

The deployment is configured for OpenShift's security model:

| Setting | Value | Notes |
|---------|-------|-------|
| Security Context Constraint | `nonroot-v2` | Annotated in deployment |
| `runAsUser` | *Not set* | Let OpenShift assign from namespace UID range |
| `runAsNonRoot` | `true` | Enforced for security |
| `fsGroup` | `0` | Root group for file permissions |
| MCS Labels | `s0:c48,c17` | SELinux multi-category security |
| Capabilities | `ALL` dropped | Minimal privileges |

### Namespace UID Range

OpenShift assigns UIDs from the namespace's annotation. Verify with:

```bash
oc get namespace <your-namespace> -o jsonpath='{.metadata.annotations.openshift\.io/sa\.scc\.uid-range}'
```

Expected format: `1002290000/10000` (start/range)

---

## Resource Limits

Configured in `deployment.yaml`:

| Resource | Request | Limit |
|----------|---------|-------|
| CPU | 200m | 500m |
| Memory | 256Mi | 512Mi |

Adjust these based on observed performance. To modify:

```yaml
resources:
  requests:
    cpu: "200m"
    memory: "256Mi"
  limits:
    cpu: "500m"
    memory: "512Mi"
```

---

## Pipeline Configuration

### Registry Secret

If using a private registry, create credentials:

```bash
oc create secret docker-registry registry-credentials \
  --docker-server=<registry-url> \
  --docker-username=<username> \
  --docker-password=<password>
```

Link to the pipeline service account:

```bash
oc secrets link pipeline-sa registry-credentials --for=pull,mount
```

### Pipeline Parameters

Update `pipeline-run.yaml` or create a new PipelineRun with:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `git-url` | Repository URL | `https://github.com/your-org/viavi-meter-provisioning.git` |
| `git-revision` | Branch or tag to build | `main` |
| `image-name` | Target image name | `viavi-meter-provisioning` |
| `image-tag` | Image tag | `latest` or semantic version |

---

## Route Configuration

### Hostname

By default, OpenShift generates a hostname. To use a custom hostname, update `route.yaml`:

```yaml
spec:
  host: viavi-provisioning.apps.your-cluster.example.com
```

### TLS Configuration

The route is configured for edge TLS termination with redirect:

| Setting | Value |
|---------|-------|
| Termination | `edge` |
| Insecure Edge Policy | `Redirect` |

For custom certificates, add to the route:

```yaml
spec:
  tls:
    termination: edge
    certificate: |
      -----BEGIN CERTIFICATE-----
      ...
      -----END CERTIFICATE-----
    key: |
      -----BEGIN RSA PRIVATE KEY-----
      ...
      -----END RSA PRIVATE KEY-----
```

---

## Post-Deployment Verification

### Checklist

- [ ] Pod is running: `oc get pods -l app=viavi-meter-provisioning`
- [ ] Pod is ready (1/1): `oc get pods -l app=viavi-meter-provisioning -o jsonpath='{.items[0].status.containerStatuses[0].ready}'`
- [ ] Liveness probe passing: No restarts in `oc get pods`
- [ ] Route accessible: `curl -I https://<route-hostname>/`
- [ ] Application loads in browser
- [ ] Config files served: `curl https://<route-hostname>/config/approved-ouis.json`
- [ ] Environment variables injected: Check browser DevTools → Network → look for API calls

### Verification Commands

```bash
# Check pod status
oc get pods -l app=viavi-meter-provisioning

# View pod logs
oc logs -l app=viavi-meter-provisioning

# Describe pod for events
oc describe pod -l app=viavi-meter-provisioning

# Get route URL
oc get route viavi-meter-provisioning -o jsonpath='{.spec.host}'

# Test endpoint
curl -I https://$(oc get route viavi-meter-provisioning -o jsonpath='{.spec.host}')/
```

---

## Troubleshooting

### Common Issues

#### Permission Denied Errors

**Symptom:** Pod fails to start with permission errors on `/var/cache/nginx` or similar.

**Solution:** Ensure the NGINX configuration uses `/tmp` for writable directories (already configured in `nginx-spa.conf`).

```bash
# Check pod logs for permission errors
oc logs -l app=viavi-meter-provisioning
```

#### Pod CrashLoopBackOff

**Symptom:** Pod repeatedly restarts.

**Solution:**
1. Check logs: `oc logs -l app=viavi-meter-provisioning --previous`
2. Verify ConfigMap/Secret exist: `oc get configmap app-config` and `oc get secret app-secrets`
3. Check security context: `oc describe pod -l app=viavi-meter-provisioning`

#### Route Not Accessible

**Symptom:** 503 or connection refused.

**Solution:**
1. Verify service exists: `oc get svc viavi-meter-provisioning`
2. Check endpoints: `oc get endpoints viavi-meter-provisioning`
3. Verify network policy allows traffic: `oc get networkpolicy`

#### ConfigMap/Secret Not Injected

**Symptom:** Application shows default/empty values.

**Solution:**
1. Verify resources exist:
   ```bash
   oc get configmap app-config -o yaml
   oc get secret app-secrets -o yaml
   ```
2. Check pod environment:
   ```bash
   oc exec -it <pod-name> -- env | grep VITE
   ```
3. Restart deployment to pick up changes:
   ```bash
   oc rollout restart deployment/viavi-meter-provisioning
   ```

### Useful Debug Commands

```bash
# Interactive shell in pod
oc exec -it <pod-name> -- /bin/sh

# Check NGINX config
oc exec -it <pod-name> -- cat /etc/nginx/nginx.conf

# Check environment variables
oc exec -it <pod-name> -- env

# View events
oc get events --sort-by='.lastTimestamp'

# Check resource usage
oc adm top pod -l app=viavi-meter-provisioning
```

---

## Quick Reference: Deployment Commands

```bash
# Full deployment from scratch
oc new-project viavi-meter-provisioning
oc apply -f openshift/serviceaccount.yaml
oc apply -f openshift/configmap.yaml  # Edit values first!
oc create secret generic app-secrets --from-literal=VITE_SUPABASE_ANON_KEY=<key>
oc apply -f openshift/deployment.yaml
oc apply -f openshift/service.yaml
oc apply -f openshift/route.yaml
oc apply -f openshift/network-policy.yaml

# Pipeline deployment
oc apply -f openshift/pipeline/pipeline-pvc.yaml
oc apply -f openshift/pipeline/service-account.yaml
oc apply -f openshift/pipeline/pipeline.yaml
oc create -f openshift/pipeline/pipeline-run.yaml

# Update after code changes
oc create -f openshift/pipeline/pipeline-run.yaml  # Triggers new build

# Rollback
oc rollout undo deployment/viavi-meter-provisioning
```
