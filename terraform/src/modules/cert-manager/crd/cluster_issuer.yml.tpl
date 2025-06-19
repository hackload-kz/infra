apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: ${cluster_issuer}
spec:
  acme:
    email: ${acme_email}
    server: ${acme_server}
    privateKeySecretRef:
      name: ${cluster_issuer}-private-key
    solvers:
      - http01:
          ingress:
            serviceType: ClusterIP
            ingressClassName: traefik
