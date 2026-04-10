# GitOps & CI/CD — Praxiswissen

## Überblick

GitLab, GitHub, Docker, CI/CD Pipelines, GitOps.

## GitLab

```bash
# GitLab CE installieren
curl -sS https://packages.gitlab.com/install/repositories/gitlab/gitlab-ce/script.deb.sh | sudo bash
sudo EXTERNAL_URL="https://gitlab.example.com" apt-get install gitlab-ce

# Runner registrieren
sudo gitlab-runner register \
  --url "https://gitlab.example.com" \
  --registration-token "TOKEN" \
  --executor "docker"
```

## GitLab CI Pipeline

```yaml
stages:
  - build
  - test
  - deploy

build:
  stage: build
  image: docker:24.0.5
  services:
    - docker:24.0.5-dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```

## Docker

```bash
# Docker installieren
sudo apt install -y docker.io docker-compose

# Logs filtern
docker logs <container> 2>&1 | grep -i error

# Container inspect
docker inspect <container>
```

## GitOps Pipeline

```
[Code Commit] → [GitLab CI] → [Build Image] → [Push to Registry]
                                            ↓
                    [ArgoCD erkennt Änderung] → [Sync zu Kubernetes]
```

## GitHub

```bash
git clone https://github.com/username/repo.git
git add . && git commit -m "message"
git push origin main
```

## Relevant Conversations

- `GitLab Funktionen und Alternativen.md`
- `Docker Run Invalid Reference..md`
- `GitHub Push Anleitung.md`
