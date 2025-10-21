import json
import urllib.request
import datetime
from datetime import date

# Optional dependencies (boto3, pypdf) are used in some deployments but are not
# required for the simple local handler. Import defensively so static analysis
# in this workspace doesn't fail when packages are not installed.
try:
    import boto3  # type: ignore
except Exception:
    boto3 = None  # type: ignore

try:
    from pypdf import PdfReader  # type: ignore
except Exception:
    PdfReader = None  # type: ignore

def handler(event, context):
    body = json.loads(event.get('body','{}'))
    tender = body.get('tender')
    docs = body.get('docs', [])
    checks = []
    for doc in docs:
        status = 'PASS'
        detail = {}
        if doc.get('type') == 'CR12':
            try:
                issue = datetime.datetime.fromisoformat(doc.get('issueDate'))
                age = (date.today() - issue.date()).days
            except Exception:
                age = 0
            status = 'FAIL' if age > 365 else 'PASS'
            detail = {'age_days': age}
        if doc.get('type') == 'TCC':
            try:
                expiry = datetime.datetime.fromisoformat(doc.get('expiryDate'))
                rem = (expiry.date() - date.today()).days
            except Exception:
                rem = 0
            status = 'FAIL' if rem < 30 else 'PASS'
            detail = {'remaining_days': rem}
        checks.append({'docType': doc.get('type'), 'status': status, 'detail': detail})
    return {
        'statusCode': 200,
        'body': json.dumps(checks),
        'headers': {'Content-Type': 'application/json'}
    }
