import sys
import json
import urllib.request

sys.stdout.reconfigure(encoding="utf-8")

def check():
    print("--- CHECK USERS ---")
    req = urllib.request.urlopen("http://127.0.0.1:8080/api/v1/users")
    users_data = json.loads(req.read())
    print(f"Total Users: {users_data['total']}")
    for u in users_data['items']:
        print(f" - {u['full_name']} | Dept: {u['department']} | Role: {u['position']} | Status: {u['status']}")

    print("\n--- CHECK DEPARTMENTS ---")
    req_d = urllib.request.urlopen("http://127.0.0.1:8080/api/v1/departments")
    dept_data = json.loads(req_d.read())
    print(f"Total Departments: {dept_data['total']}")
    total_members_in_depts = 0
    for d in dept_data['items']:
        total_members_in_depts += d['member_count']
        req_detail = urllib.request.urlopen(f"http://127.0.0.1:8080/api/v1/departments/{d['id']}")
        detail = json.loads(req_detail.read())
        member_names = [m['full_name'] for m in detail.get('members', [])]
        print(f" - [{d['code']}] {d['name']} | Count: {d['member_count']} | Members: {member_names}")

    print(f"\nSum of member_count across all departments: {total_members_in_depts}")
    assert total_members_in_depts == users_data['total'], "Mismatch between total users and department member count!"
    print("SUCCESS: Department counts and User counts are perfectly synchronized!")

if __name__ == "__main__":
    check()
