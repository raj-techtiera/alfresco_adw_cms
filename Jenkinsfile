pipeline {
    agent any
    environment {
        DIST_PATH    = 'dist/PTTEP'
        NGINX_DEPLOY = '/opt/nginx/adw/PTTEP'
        APP_SERVER   = 'ubuntu@192.168.60.142'
    }
    stages {
        stage('Checkout') {
            steps {
                echo '>>> Pulling latest changes from GitHub...'
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                echo '>>> Running npm install...'
                sh 'npm install'
            }
        }

        stage('Build Application') {
            steps {
                echo '>>> Building Angular app...'
                sh 'npx nx build content-ee'
                echo '>>> Build complete. dist/ folder generated.'
            }
        }

        stage('Stop Nginx on App Server') {
            steps {
                echo '>>> Stopping Nginx on App Server...'
                sh "ssh -o StrictHostKeyChecking=no ${APP_SERVER} 'sudo systemctl stop nginx'"
            }
        }

        stage('Delete Old PTTEP on App Server') {
            steps {
                echo '>>> Deleting old PTTEP from App Server...'
                sh "ssh -o StrictHostKeyChecking=no ${APP_SERVER} 'sudo rm -rf ${NGINX_DEPLOY}'"
                echo '>>> Old PTTEP deleted successfully.'
            }
        }

        stage('Deploy New PTTEP to App Server') {
            steps {
                echo '>>> Copying new build to App Server...'
                sh "ssh -o StrictHostKeyChecking=no ${APP_SERVER} 'sudo mkdir -p ${NGINX_DEPLOY} && sudo chown -R ubuntu:ubuntu ${NGINX_DEPLOY}'"
                sh "scp -o StrictHostKeyChecking=no -r ${DIST_PATH}/* ${APP_SERVER}:${NGINX_DEPLOY}/"
                echo '>>> New PTTEP deployed to App Server successfully.'
            }
        }

        stage('Verify Deployed Files on App Server') {
            steps {
                echo '>>> Verifying new PTTEP files on App Server...'
                sh "ssh -o StrictHostKeyChecking=no ${APP_SERVER} 'ls -la ${NGINX_DEPLOY}/'"
            }
        }

        stage('Start Nginx on App Server') {
            steps {
                echo '>>> Starting Nginx on App Server...'
                sh "ssh -o StrictHostKeyChecking=no ${APP_SERVER} 'sudo systemctl start nginx'"
            }
        }

        stage('Nginx Status After Start') {
            steps {
                echo '>>> Verifying Nginx is running on App Server...'
                sh "ssh -o StrictHostKeyChecking=no ${APP_SERVER} 'sudo systemctl status nginx'"
            }
        }
    }

    post {
        success {
            echo '>>> New PTTEP Deployment to App Server Successful!'
        }
        failure {
            echo '>>> Pipeline failed!'
            sh "ssh -o StrictHostKeyChecking=no ${APP_SERVER} 'sudo systemctl start nginx || true'"
        }
        always {
            echo '>>> Pipeline execution completed.'
        }
    }
}