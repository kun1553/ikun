---
title: KMP 算法：从背模板到真正理解
date: 2025-10-06
tags: [算法, 数据结构]
summary: 手推 ababaca 的部分匹配表，讲清 next 数组含义，给出 Java 和 C++ 实现与线性复杂度由来。
featured: true
---

## 从背模板到被问住

准备算法课时，我把 KMP 的模板默写了不下十遍，考试也能写出来。但真正让我确认自己没懂的，是同学问我的一个问题：next 数组到底在描述什么？我张嘴想说「就是失配的时候跳回哪里」，然后发现自己没法解释为什么是跳到那个位置，也没法解释它为什么能保证线性时间。

后来我花了两个晚上把这件事想清楚了，这篇笔记就是那时候的产物。

## next 数组的含义

我用的是「最长相等前后缀」这一种定义：`next[i]` 等于子串 `s[0..i]` 的最长相等真前后缀的长度。真前后缀的意思是，前缀不能等于子串本身，后缀同理。

拿 `ababaca` 手推一遍：

- `next[0]`，子串 `a`，没有真前后缀，等于 0
- `next[1]`，子串 `ab`，可能的前缀是 `a`、后缀是 `b`，不相等，等于 0
- `next[2]`，子串 `aba`，前缀 `a`、后缀 `a`，长度 1
- `next[3]`，子串 `abab`，前缀 `ab`、后缀 `ab`，长度 2
- `next[4]`，子串 `ababa`，最长的相等前后缀是 `aba`，长度 3
- `next[5]`，子串 `ababac`，末尾是 `c`，`a` 和 `c` 对不上，一路退到 0
- `next[6]`，子串 `ababaca`，前缀 `a`、后缀 `a`，等于 1

所以 `next = [0, 0, 1, 2, 3, 0, 1]`。它的意义是：如果在位置 `i` 的**下一个**字符处失配，说明 `s[0..i]` 这一段已经匹配上了，而它的最长相等前后缀长度是 `next[i]`，那么前 `next[i]` 个字符不需要再比，直接从模式串的 `next[i]` 位置继续比就行了。

## Java 实现

```java
public class Kmp {

    // next[i] = pattern[0..i] 的最长相等真前后缀长度
    static int[] buildNext(String p) {
        int[] next = new int[p.length()];
        int j = 0; // 当前已匹配上的最长相等前后缀长度
        for (int i = 1; i < p.length(); i++) {
            while (j > 0 && p.charAt(i) != p.charAt(j)) {
                j = next[j - 1]; // 退到次长的相等前后缀继续试
            }
            if (p.charAt(i) == p.charAt(j)) {
                j++;
            }
            next[i] = j;
        }
        return next;
    }

    static int indexOf(String s, String p) {
        if (p.isEmpty()) return 0;
        int[] next = buildNext(p);
        int j = 0;
        for (int i = 0; i < s.length(); i++) {
            while (j > 0 && s.charAt(i) != p.charAt(j)) {
                j = next[j - 1];
            }
            if (s.charAt(i) == p.charAt(j)) {
                j++;
            }
            if (j == p.length()) {
                return i - j + 1; // 匹配成功，返回起始下标
            }
        }
        return -1;
    }
}
```

`buildNext` 里的 `j` 同时承担两个角色：它既表示「当前最长相等前后缀的长度」，又表示「下一个要和 `p[i]` 比较的前缀位置」。因为长度本身就可以当下标用，这一点想清楚之后整段代码就不绕了。

## C++ 实现

```cpp
#include <string>
#include <vector>
using namespace std;

vector<int> buildNext(const string& p) {
    vector<int> next(p.size(), 0);
    int j = 0;
    for (size_t i = 1; i < p.size(); ++i) {
        while (j > 0 && p[i] != p[j]) j = next[j - 1];
        if (p[i] == p[j]) ++j;
        next[i] = j;
    }
    return next;
}

int kmp(const string& s, const string& p) {
    if (p.empty()) return 0;
    vector<int> next = buildNext(p);
    int j = 0;
    for (int i = 0; i < (int)s.size(); ++i) {
        while (j > 0 && s[i] != p[j]) j = next[j - 1];
        if (s[i] == p[j]) ++j;
        if (j == (int)p.size()) return i - j + 1;
    }
    return -1;
}
```

C++ 版本有个容易忽略的细节：`size()` 返回 `size_t`，和 `int` 混用会有符号比较的警告，所以循环里我显式转成了 `int`。

## 为什么暴力是 O(n*m)，KMP 是 O(n+m)

暴力匹配的问题在于主串指针会回退。假设主串是 `aaaaaab`，模式串是 `aaab`，每一轮都会比较到第四个字符才失配，然后主串指针退回到这一轮起点的下一个位置重新比。最坏情况下每个起点都要比 m 次，总共 O(n*m)。

KMP 的主串指针 `i` 从不回退，失配时动的是模式串指针 `j`。每一次 `j = next[j - 1]` 都让 `j` 严格变小，而 `j` 在整个匹配过程中最多增加 n 次（每匹配成功一个字符加一），所以总的回退次数也不会超过 n 次。两段加起来是 O(n + m)。这个「均摊」的论证是我当时最没想通的一点，写下来之后才踏实。

## 我把 next[0] 写错导致的死循环

最开始我在 `buildNext` 里写的是：

```java
while (j >= 0 && p.charAt(i) != p.charAt(j)) {
    j = next[j]; // 错的
}
```

在这套定义下 `next[0]` 等于 0，所以当 `j` 退到 0、并且 `p.charAt(0)` 和当前字符仍然不相等时，`j = next[0] = 0`，`j` 原地不动，而 `j >= 0` 永远成立——死循环。我一开始以为是输入太长跑得慢，加了个计数器打印，才发现循环跑了上百万次。

正确的写法是 `j > 0` 加上 `j = next[j - 1]`，这样 `j` 至少能降到 0 并退出循环。现在回头看，这个 bug 恰好说明我当时没理解下标的语义：`next[j]` 描述的是「以 j 结尾的子串」，失配发生在 `j` 位置时，能复用的是 `j-1` 那段的信息，而不是 `j` 自己的。
