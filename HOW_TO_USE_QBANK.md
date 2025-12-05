# 📚 Q-Bank Manager - Complete User Guide

## 🎯 **How to Organize and Assign Questions**

---

## 📋 **STEP-BY-STEP GUIDE:**

### **Step 1: View All Your Questions**

1. Go to **Q-Bank Manager**
2. Click **"All Questions"** folder in the sidebar
3. You'll see **ALL 50 questions** displayed in the table

---

### **Step 2: Organize Questions into Folders**

You have **TWO methods** to organize:

#### **Method A: Drag & Drop (CLONE)**
✅ **Best for:** Adding questions to multiple topics

```
1. View "All Questions"
2. Drag a question from the table
3. Drop it on "Adult Health" folder
4. ✨ Question is CLONED (copy created)
5. Original stays in "All Questions"
```

**Visual Feedback:**
- 🟢 Folder highlights green when you drag over it
- 📋 Banner shows "Drop to clone"
- ⊕ Cursor shows copy icon

#### **Method B: Dropdown (MOVE)**
✅ **Best for:** Setting the primary folder

```
1. Find the "FOLDER" column in the table
2. Click the dropdown (shows "None")
3. Select "Adult Health"
4. ✨ Question MOVES to that folder
5. Dropdown updates to show "Adult Health"
```

---

### **Step 3: Verify Folder Contents**

1. Click **"Adult Health"** folder in sidebar
2. Count should show **(3)** next to folder name
3. Table shows only questions in that folder
4. Each question shows "Adult Health" in dropdown

---

### **Step 4: Assign Questions to Course**

1. Select **"Adult Health"** folder (must have questions!)
2. Click **"+ Add to Course"** button below folder name
3. Modal opens showing:
   - ✅ "Ready to assign: **3 questions** from Adult Health"
4. Select a course from the list
5. Click **"Assign Questions"**
6. ✨ Success! Questions added to course

---

## 🎨 **UNDERSTANDING THE INTERFACE:**

### **Folder Sidebar (Left):**
```
📋 All Questions (50)        ← Shows EVERYTHING
   Adult Health (3)          ← Questions in this folder
   Pediatrics (0)            ← Empty folder
   Maternity (1)             ← 1 question here
```

**Counts Explained:**
- **All Questions:** Total count of all questions
- **Specific Folders:** Count of questions assigned to that folder
- A question can appear in multiple folders (via cloning)

---

### **Questions Table (Right):**

| Column | Purpose |
|--------|---------|
| **Checkbox** | Select for bulk operations |
| **ID** | Unique question identifier |
| **STEM PREVIEW** | Question text preview |
| **FOLDER** | Dropdown to MOVE question |
| **TYPE** | Question format |
| **TEST** | CLASSIC or NGN |
| **ACTIONS** | Edit button |

---

## 🔄 **CLONE vs MOVE:**

### **CLONE (Drag & Drop):**
- ✅ Creates a **copy** of the question
- ✅ Original stays in place
- ✅ Question exists in **multiple folders**
- ✅ Good for: Reusing questions across topics

**Example:**
```
Drag "Cardiac Assessment" from All Questions
Drop on "Adult Health"
Drop on "Critical Care"
Result: Question in 3 places (All, Adult, Critical)
```

### **MOVE (Dropdown):**
- ✅ Changes **primary folder**
- ✅ Question belongs to **one folder**
- ✅ Updates the "FOLDER" column
- ✅ Good for: Organizing and categorizing

**Example:**
```
Question shows "None" in dropdown
Change to "Adult Health"
Result: Question's primary folder is now Adult Health
```

---

## 💡 **BEST PRACTICES:**

### **1. Start with "All Questions"**
- Always view "All Questions" first to see everything
- Then organize into folders

### **2. Use Folders for Topics**
- Adult Health
- Pediatrics
- Maternity
- Mental Health
- etc.

### **3. Clone for Cross-Topic Questions**
- Some questions fit multiple topics
- Clone them to all relevant folders
- Students can practice from any topic

### **4. Assign by Folder**
- Organize first, then assign
- Select folder → Add to Course
- All questions in folder get assigned

---

## 🐛 **TROUBLESHOOTING:**

### **Problem: "No questions in folder"**
**Solution:** 
1. Go to "All Questions"
2. Drag questions to the folder OR
3. Use dropdown to move questions

### **Problem: "All Questions" shows only 3 instead of 50**
**Solution:** 
- This was a bug, now FIXED!
- Refresh browser (Ctrl+F5)
- Should show all 50 questions

### **Problem: Dropdown shows "None" even after assigning**
**Solution:**
- This was a bug, now FIXED!
- API now returns `categoryId`
- Refresh browser to see correct folders

---

## 🚀 **QUICK WORKFLOW:**

### **Scenario: Organize 50 Questions into Topics**

```
1. Go to Q-Bank Manager
2. Click "All Questions" (see all 50)
3. Drag 10 questions → "Adult Health"
4. Drag 8 questions → "Pediatrics"
5. Drag 12 questions → "Maternity"
6. etc.

Result: Questions organized by topic!
```

### **Scenario: Assign Questions to Course**

```
1. Click "Adult Health" folder (shows 10 questions)
2. Click "+ Add to Course"
3. Select "NCLEX-RN Fundamentals"
4. Click "Assign Questions"
5. ✅ Done! 10 questions added to course
```

---

## ✨ **NEW FEATURES:**

1. ✅ **Visual drag feedback** - Green highlights
2. ✅ **Clone support** - Questions in multiple folders
3. ✅ **Helpful tooltips** - "💡 Drag to clone"
4. ✅ **Clear messaging** - Know what's happening
5. ✅ **Proper validation** - Can't assign empty folders

---

## 🎉 **YOU'RE ALL SET!**

Your Q-Bank is now **fully functional** with:
- ✅ Proper folder organization
- ✅ Clone and move capabilities
- ✅ Visual feedback
- ✅ Course assignment
- ✅ All 50 questions accessible

**Refresh your browser and start organizing!** 📚


